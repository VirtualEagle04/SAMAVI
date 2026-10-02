import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../../../src/database/prisma.js";
import { listStock } from "../../../src/modules/inventario/inventario.service.js";

vi.mock("../../../src/database/prisma.js", () => ({
  prisma: {
    insumo: { findMany: vi.fn() },
  },
}));

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
