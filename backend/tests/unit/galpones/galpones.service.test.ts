import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  cambiarGallinas,
  listGalpones,
  registrarAlimentacion,
} from "../../../src/modules/galpones/galpones.service.js";
import { prisma } from "../../../src/database/prisma.js";
import type { AppError } from "../../../src/shared/errors/app-error.js";

vi.mock("../../../src/database/prisma.js", () => {
  const client = {
    galpon: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    auditoria: { create: vi.fn(), findMany: vi.fn() },
    registroAlimentacion: { create: vi.fn(), findMany: vi.fn() },
    $transaction: vi.fn(),
  };
  client.$transaction.mockImplementation((callback: (tx: unknown) => unknown) => callback(client));
  return { prisma: client };
});

const mockedPrisma = prisma as unknown as {
  galpon: Record<string, ReturnType<typeof vi.fn>>;
  auditoria: Record<string, ReturnType<typeof vi.fn>>;
  registroAlimentacion: Record<string, ReturnType<typeof vi.fn>>;
};

async function rejection(promise: Promise<unknown>): Promise<AppError> {
  try {
    await promise;
  } catch (error) {
    return error as AppError;
  }
  throw new Error("Expected promise to reject");
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listGalpones", () => {
  it("marks a galpon as alimentado when it has today's record", async () => {
    const registradoEn = new Date();
    mockedPrisma.galpon.findMany.mockResolvedValue([
      { id: 1, nombre: "G1", gallinasActuales: 10, estado: "activo", alimentaciones: [{ registradoEn }] },
      { id: 2, nombre: "G2", gallinasActuales: 0, estado: "inactivo", alimentaciones: [] },
    ]);
    const result = await listGalpones();
    expect(result[0]).toMatchObject({ id: 1, alimentadoHoy: true, alimentadoEn: registradoEn });
    expect(result[1]).toMatchObject({ id: 2, alimentadoHoy: false, alimentadoEn: null });
    expect(result[0]).not.toHaveProperty("alimentaciones");
  });
});

describe("registrarAlimentacion", () => {
  it("throws 404 when the galpon does not exist", async () => {
    mockedPrisma.galpon.findUnique.mockResolvedValue(null);
    expect((await rejection(registrarAlimentacion(9, 1))).statusCode).toBe(404);
  });

  it.each(["inactivo", "mantenimiento"])("throws 409 when the galpon is %s", async (estado) => {
    mockedPrisma.galpon.findUnique.mockResolvedValue({ id: 1, estado });
    expect((await rejection(registrarAlimentacion(1, 1))).statusCode).toBe(409);
    expect(mockedPrisma.registroAlimentacion.create).not.toHaveBeenCalled();
  });

  it("throws 409 when today's record already exists (unique violation)", async () => {
    mockedPrisma.galpon.findUnique.mockResolvedValue({ id: 1, estado: "activo" });
    mockedPrisma.registroAlimentacion.create.mockRejectedValue({ code: "P2002" });
    const error = await rejection(registrarAlimentacion(1, 1));
    expect(error.statusCode).toBe(409);
    expect(error.message).toContain("ya fue alimentado");
  });

  it("creates the record for the authenticated user", async () => {
    mockedPrisma.galpon.findUnique.mockResolvedValue({ id: 1, estado: "activo" });
    mockedPrisma.registroAlimentacion.create.mockResolvedValue({ idGalpon: 1, fecha: new Date(), registradoEn: new Date() });
    await registrarAlimentacion(1, 5);
    expect(mockedPrisma.registroAlimentacion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ idGalpon: 1, idUsuario: 5 }),
    });
  });
});

describe("cambiarGallinas", () => {
  it("throws 404 when the galpon does not exist", async () => {
    mockedPrisma.galpon.findUnique.mockResolvedValue(null);
    const error = await rejection(cambiarGallinas(9, 1, { tipo: "ingreso", cantidad: 1 }, undefined));
    expect(error.statusCode).toBe(404);
  });

  it("throws 409 when the galpon is not activo", async () => {
    mockedPrisma.galpon.findUnique.mockResolvedValue({ id: 2, estado: "inactivo", gallinasActuales: 0 });
    const error = await rejection(cambiarGallinas(2, 1, { tipo: "ingreso", cantidad: 1 }, undefined));
    expect(error.statusCode).toBe(409);
    expect(mockedPrisma.galpon.update).not.toHaveBeenCalled();
  });

  it("throws 409 and writes no audit when a baja exceeds the current hens", async () => {
    mockedPrisma.galpon.findUnique.mockResolvedValue({ id: 1, estado: "activo", gallinasActuales: 5 });
    mockedPrisma.galpon.updateMany.mockResolvedValue({ count: 0 });
    const error = await rejection(cambiarGallinas(1, 1, { tipo: "baja", cantidad: 6, causa: "x" }, undefined));
    expect(error.statusCode).toBe(409);
    expect(mockedPrisma.auditoria.create).not.toHaveBeenCalled();
  });

  it("applies a baja and audits previous/new values with the causa", async () => {
    mockedPrisma.galpon.findUnique.mockResolvedValue({ id: 1, estado: "activo", gallinasActuales: 10 });
    mockedPrisma.galpon.updateMany.mockResolvedValue({ count: 1 });
    mockedPrisma.galpon.findUniqueOrThrow.mockResolvedValue({ id: 1, estado: "activo", gallinasActuales: 7 });
    await cambiarGallinas(1, 3, { tipo: "baja", cantidad: 3, causa: "Enfermedad" }, "::1");
    expect(mockedPrisma.galpon.updateMany).toHaveBeenCalledWith({
      where: { id: 1, gallinasActuales: { gte: 3 } },
      data: { gallinasActuales: { decrement: 3 } },
    });
    expect(mockedPrisma.auditoria.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        idUsuario: 3,
        tablaAfectada: "galpon",
        idRegistroAfectado: "1",
        accion: "UPDATE",
        datosAnteriores: { gallinasActuales: 10 },
        datosNuevos: { gallinasActuales: 7, tipo: "baja", cantidad: 3, causa: "Enfermedad" },
        ipOrigen: "::1",
        resultado: "EXITOSO",
      }),
    });
  });

  it("applies an ingreso with increment", async () => {
    mockedPrisma.galpon.findUnique.mockResolvedValue({ id: 1, estado: "activo", gallinasActuales: 10 });
    mockedPrisma.galpon.update.mockResolvedValue({});
    mockedPrisma.galpon.findUniqueOrThrow.mockResolvedValue({ id: 1, estado: "activo", gallinasActuales: 15 });
    const result = await cambiarGallinas(1, 3, { tipo: "ingreso", cantidad: 5 }, undefined);
    expect(mockedPrisma.galpon.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { gallinasActuales: { increment: 5 } },
    });
    expect(result.gallinasActuales).toBe(15);
  });
});
