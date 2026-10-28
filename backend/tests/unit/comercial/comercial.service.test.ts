import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "../../../src/database/prisma.js";
import { changePedidoStatus, deleteMayorista, upsertPrecio } from "../../../src/modules/comercial/comercial.service.js";

vi.mock("../../../src/database/prisma.js", () => {
  const client = {
    mayorista: { findUnique: vi.fn(), delete: vi.fn() },
    categoriaPeso: { findUnique: vi.fn() },
    precio: { findUnique: vi.fn(), upsert: vi.fn() },
    pedido: { findUnique: vi.fn(), update: vi.fn() },
    auditoria: { create: vi.fn() },
    $transaction: vi.fn(),
  };
  client.$transaction.mockImplementation((callback: (tx: unknown) => unknown) => callback(client));
  return { prisma: client };
});

const mocked = prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;
const CONTEXTO = { userId: 2, ip: "::1" };

function decimal(value: number) {
  return { toNumber: () => value };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocked.mayorista!.findUnique!.mockResolvedValue({ id: 1, nombre: "Don Pepe", ubicacion: null, contacto: null });
  mocked.categoriaPeso!.findUnique!.mockResolvedValue({ codigo: "AA" });
  mocked.precio!.upsert!.mockResolvedValue({});
});

describe("upsertPrecio", () => {
  it("audita un precio nuevo como INSERT sin valor anterior", async () => {
    mocked.precio!.findUnique!.mockResolvedValue(null);

    await upsertPrecio(1, { categoriaPeso: "AA", valorUnitario: 15000 }, CONTEXTO);

    expect(mocked.auditoria!.create).toHaveBeenCalledWith({
      data: {
        idUsuario: 2,
        tablaAfectada: "precio",
        idRegistroAfectado: "1:AA",
        accion: "INSERT",
        datosNuevos: { idMayorista: 1, categoriaPeso: "AA", valorUnitario: 15000 },
        ipOrigen: "::1",
        resultado: "EXITOSO",
      },
    });
  });

  it("audita un cambio de precio como UPDATE con el valor anterior", async () => {
    mocked.precio!.findUnique!.mockResolvedValue({ valorUnitario: decimal(14000) });

    await upsertPrecio(1, { categoriaPeso: "AA", valorUnitario: 15000 }, CONTEXTO);

    expect(mocked.auditoria!.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        accion: "UPDATE",
        datosAnteriores: { idMayorista: 1, categoriaPeso: "AA", valorUnitario: 14000 },
        datosNuevos: { idMayorista: 1, categoriaPeso: "AA", valorUnitario: 15000 },
      }),
    });
  });
});

describe("changePedidoStatus", () => {
  it("audita el estado anterior y el nuevo", async () => {
    mocked.pedido!.findUnique!.mockResolvedValue({ id: 4, estado: "pendiente", idMayorista: 1, detalles: [] });
    mocked.pedido!.update!.mockResolvedValue({ id: 4, estado: "cancelado" });

    await changePedidoStatus(4, "cancelado", CONTEXTO);

    expect(mocked.auditoria!.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tablaAfectada: "pedido",
        idRegistroAfectado: "4",
        accion: "UPDATE",
        datosAnteriores: { estado: "pendiente" },
        datosNuevos: { estado: "cancelado" },
      }),
    });
  });

  it("no audita una transición inválida", async () => {
    mocked.pedido!.findUnique!.mockResolvedValue({ id: 4, estado: "cancelado", idMayorista: 1, detalles: [] });

    await expect(changePedidoStatus(4, "cargado", CONTEXTO)).rejects.toMatchObject({ statusCode: 409 });
    expect(mocked.auditoria!.create).not.toHaveBeenCalled();
  });
});

describe("deleteMayorista", () => {
  it("audita el borrado con los datos anteriores", async () => {
    await deleteMayorista(1, CONTEXTO);

    expect(mocked.auditoria!.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tablaAfectada: "mayorista",
        accion: "DELETE",
        datosAnteriores: { nombre: "Don Pepe", ubicacion: null, contacto: null },
      }),
    });
  });

  it("responde 409 si el mayorista tiene datos asociados", async () => {
    mocked.mayorista!.delete!.mockRejectedValue(new Error("Foreign key constraint"));

    await expect(deleteMayorista(1, CONTEXTO)).rejects.toMatchObject({ statusCode: 409 });
    expect(mocked.auditoria!.create).not.toHaveBeenCalled();
  });
});
