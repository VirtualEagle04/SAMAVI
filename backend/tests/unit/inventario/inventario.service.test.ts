import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../../../src/database/prisma.js";
import { deleteProveedor, listStock, updateInsumo } from "../../../src/modules/inventario/inventario.service.js";

vi.mock("../../../src/database/prisma.js", () => {
  const client = {
    insumo: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    proveedor: { findUnique: vi.fn(), delete: vi.fn() },
    auditoria: { create: vi.fn() },
    $transaction: vi.fn(),
  };
  client.$transaction.mockImplementation((callback: (tx: unknown) => unknown) => callback(client));
  return { prisma: client };
});

const mockInsumoFindMany = prisma.insumo.findMany as ReturnType<typeof vi.fn>;

function decimal(value: number) {
  return { toNumber: () => value };
}

beforeEach(() => vi.clearAllMocks());

describe("inventario.service -> listStock", () => {
  it("suma entradas y resta salidas, y calcula la valorización", async () => {
    mockInsumoFindMany.mockResolvedValue([
      {
        id: 1,
        codigo: "BAN-30",
        nombre: "Bandeja",
        unidadMedida: "unidad",
        stockMinimo: decimal(20),
        costo: decimal(8.5),
        activo: true,
        movimientos: [
          { cantidad: decimal(100), tipoMovimiento: { efecto: "entrada" } },
          { cantidad: decimal(25), tipoMovimiento: { efecto: "salida" } },
        ],
      },
    ]);

    await expect(listStock()).resolves.toEqual([{
      id: 1,
      codigo: "BAN-30",
      nombre: "Bandeja",
      unidadMedida: "unidad",
      stock: 75,
      stockMinimo: 20,
      costo: 8.5,
      valorInventario: 637.5,
      activo: true,
    }]);
  });

  it("aplica el filtro de insumo cuando se solicita", async () => {
    mockInsumoFindMany.mockResolvedValue([]);

    await listStock({ insumoId: 7 });

    expect(mockInsumoFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 7 } }));
  });
});

const mocked = prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;
const CONTEXTO = { userId: 1, ip: undefined };

function insumoRow(nombre: string) {
  return {
    id: 3,
    codigo: "BAN-30",
    nombre,
    descripcion: null,
    unidadMedida: "unidad",
    stockMinimo: decimal(20),
    costo: decimal(8.5),
    activo: true,
  };
}

describe("inventario.service -> auditoría", () => {
  it("audita la edición de un insumo con los datos anteriores y nuevos", async () => {
    mocked.insumo!.findUnique!.mockResolvedValue(insumoRow("Bandeja"));
    mocked.insumo!.update!.mockResolvedValue(insumoRow("Bandeja x30"));

    await updateInsumo(3, { codigo: "BAN-30", nombre: "Bandeja x30", unidadMedida: "unidad", stockMinimo: 20 }, CONTEXTO);

    expect(mocked.auditoria!.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tablaAfectada: "insumo",
        idRegistroAfectado: "3",
        accion: "UPDATE",
        datosAnteriores: expect.objectContaining({ nombre: "Bandeja", stockMinimo: 20, costo: 8.5 }),
        datosNuevos: expect.objectContaining({ nombre: "Bandeja x30" }),
      }),
    });
  });

  it("no audita un proveedor que no se pudo borrar", async () => {
    mocked.proveedor!.findUnique!.mockResolvedValue({ id: 2, nombre: "Agro", contacto: null, activo: true });
    mocked.proveedor!.delete!.mockRejectedValue(new Error("Foreign key constraint"));

    await expect(deleteProveedor(2, CONTEXTO)).rejects.toMatchObject({ statusCode: 409 });
    expect(mocked.auditoria!.create).not.toHaveBeenCalled();
  });
});
