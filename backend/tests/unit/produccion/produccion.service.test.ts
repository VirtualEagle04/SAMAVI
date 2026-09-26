import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerCount, listCategorias, closeDailyProduction } from "../../../src/modules/produccion/produccion.service.js";
import { prisma } from "../../../src/database/prisma.js";
import { AppError } from "../../../src/shared/errors/app-error.js";

vi.mock("../../../src/database/prisma.js", () => ({
  prisma: {
    galpon: { findUnique: vi.fn() },
    categoriaPeso: { findUnique: vi.fn(), findMany: vi.fn() },
    logConteo: { create: vi.fn(), findMany: vi.fn() },
    cierreDiario: { upsert: vi.fn() },
  },
}));

vi.mock("../../../src/config/env.js", () => ({
  env: {
    jwtSecret: "secreto-de-prueba-con-mas-de-32-caracteres-ok",
    databaseUrl: "mock://db",
    mqttUrl: "mock://mqtt",
    mqttTopic: "mock/topic",
    mqttClientId: "mock-client",
  },
}));

const mockFindUniqueGalpon = prisma.galpon.findUnique as ReturnType<typeof vi.fn>;
const mockFindUniqueCategoria = prisma.categoriaPeso.findUnique as ReturnType<typeof vi.fn>;
const mockFindManyCategoria = prisma.categoriaPeso.findMany as ReturnType<typeof vi.fn>;
const mockLogConteoCreate = prisma.logConteo.create as ReturnType<typeof vi.fn>;
const mockLogConteoFindMany = prisma.logConteo.findMany as ReturnType<typeof vi.fn>;
const mockCierreDiarioUpsert = prisma.cierreDiario.upsert as ReturnType<typeof vi.fn>;

const BASE_INPUT = {
  galponId: 1,
  categoriaPeso: "AA",
  cantidad: 1 as const,
  timestamp: new Date("2026-09-25T10:00:00Z"),
};

beforeEach(() => vi.clearAllMocks());

// ─── registerCount ────────────────────────────────────────────────────────────

describe("produccion.service → registerCount()", () => {
  it("crea el registro cuando galpón y categoría existen", async () => {
    mockFindUniqueGalpon.mockResolvedValue({ id: 1 });
    mockFindUniqueCategoria.mockResolvedValue({ codigo: "AA" });
    mockLogConteoCreate.mockResolvedValue({ id: 99 });

    const result = await registerCount(BASE_INPUT);

    expect(result).toEqual({ id: 99 });
    expect(mockLogConteoCreate).toHaveBeenCalledWith({
      data: {
        idGalpon: 1,
        codigoCategoriaPeso: "AA",
        cantidad: 1,
        timestamp: BASE_INPUT.timestamp,
      },
    });
  });

  it("lanza AppError 404 si el galpón no existe", async () => {
    mockFindUniqueGalpon.mockResolvedValue(null);
    mockFindUniqueCategoria.mockResolvedValue({ codigo: "AA" });

    await expect(registerCount(BASE_INPUT)).rejects.toThrow(
      new AppError(404, "Galpón no encontrado")
    );
    expect(mockLogConteoCreate).not.toHaveBeenCalled();
  });

  it("lanza AppError 404 si la categoría no existe", async () => {
    mockFindUniqueGalpon.mockResolvedValue({ id: 1 });
    mockFindUniqueCategoria.mockResolvedValue(null);

    await expect(registerCount(BASE_INPUT)).rejects.toThrow(
      new AppError(404, "Categoría de peso no encontrada")
    );
    expect(mockLogConteoCreate).not.toHaveBeenCalled();
  });

  it("busca el galpón por id y la categoría por código en paralelo", async () => {
    mockFindUniqueGalpon.mockResolvedValue({ id: 1 });
    mockFindUniqueCategoria.mockResolvedValue({ codigo: "AA" });
    mockLogConteoCreate.mockResolvedValue({});

    await registerCount(BASE_INPUT);

    expect(mockFindUniqueGalpon).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(mockFindUniqueCategoria).toHaveBeenCalledWith({ where: { codigo: "AA" } });
  });
});

// ─── listCategorias ───────────────────────────────────────────────────────────

describe("produccion.service → listCategorias()", () => {
  it("ordena las categorías según CATEGORY_ORDER [Y, Ex, AA, A, B, C, P]", async () => {
    mockFindManyCategoria.mockResolvedValue([
      { codigo: "B" },
      { codigo: "Y" },
      { codigo: "A" },
      { codigo: "AA" },
      { codigo: "C" },
      { codigo: "Ex" },
      { codigo: "P" },
      { codigo: "Q" }
    ]);

    const result = await listCategorias();

    expect(result.map((c: { codigo: string }) => c.codigo)).toEqual(["Y", "Ex", "AA", "A", "B", "C", "P", "Q"]);
  });

  it("coloca al final las categorías cuyo código no está en el orden definido", async () => {
    mockFindManyCategoria.mockResolvedValue([
      { codigo: "AA" },
      { codigo: "DESCONOCIDA" },
      { codigo: "Y" },
    ]);

    const result = await listCategorias();
    const codigos = result.map((c: { codigo: string }) => c.codigo);

    expect(codigos[codigos.length - 1]).toBe("DESCONOCIDA");
  });

  it("devuelve array vacío si no hay categorías", async () => {
    mockFindManyCategoria.mockResolvedValue([]);
    expect(await listCategorias()).toEqual([]);
  });
});

// ─── closeDailyProduction ─────────────────────────────────────────────────────

describe("produccion.service → closeDailyProduction()", () => {
  it("agrega los conteos del día por galpón+categoría y calcula bandejas y sobrante", async () => {
    // 3 conteos del mismo galpón+categoría → total 3 → 0 bandejas, 3 sobrante
    mockLogConteoFindMany.mockResolvedValue([
      { idGalpon: 1, codigoCategoriaPeso: "AA", cantidad: 1 },
      { idGalpon: 1, codigoCategoriaPeso: "AA", cantidad: 1 },
      { idGalpon: 1, codigoCategoriaPeso: "AA", cantidad: 1 },
    ]);
    mockCierreDiarioUpsert.mockResolvedValue({ id: 1 });

    await closeDailyProduction({ fecha: "2026-09-25" });

    expect(mockCierreDiarioUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ cantidadBandejas: 0, cantidadSobrante: 3 }),
        update: { cantidadBandejas: 0, cantidadSobrante: 3 },
      })
    );
  });

  it("divide entre 30 para calcular bandejas y usa el resto como sobrante", async () => {
    // 65 huevos → 2 bandejas de 30 + 5 sobrantes
    mockLogConteoFindMany.mockResolvedValue(
      Array.from({ length: 65 }, () => ({ idGalpon: 1, codigoCategoriaPeso: "A", cantidad: 1 }))
    );
    mockCierreDiarioUpsert.mockResolvedValue({ id: 1 });

    await closeDailyProduction({ fecha: "2026-09-25" });

    expect(mockCierreDiarioUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ cantidadBandejas: 2, cantidadSobrante: 5 }),
      })
    );
  });

  it("agrupa independientemente por galpón y por categoría", async () => {
    mockLogConteoFindMany.mockResolvedValue([
      { idGalpon: 1, codigoCategoriaPeso: "AA", cantidad: 1 },
      { idGalpon: 2, codigoCategoriaPeso: "AA", cantidad: 1 },
      { idGalpon: 1, codigoCategoriaPeso: "B",  cantidad: 1 },
    ]);
    mockCierreDiarioUpsert.mockResolvedValue({ id: 1 });

    await closeDailyProduction({ fecha: "2026-09-25" });

    expect(mockCierreDiarioUpsert).toHaveBeenCalledTimes(3);
  });

  it("un conteo negativo puede reducir el total (ajuste/corrección)", async () => {
    // +31 y -1 → total 30 → 1 bandeja exacta
    mockLogConteoFindMany.mockResolvedValue([
      ...Array.from({ length: 31 }, () => ({ idGalpon: 1, codigoCategoriaPeso: "AA", cantidad: 1 })),
      { idGalpon: 1, codigoCategoriaPeso: "AA", cantidad: -1 },
    ]);
    mockCierreDiarioUpsert.mockResolvedValue({ id: 1 });

    await closeDailyProduction({ fecha: "2026-09-25" });

    expect(mockCierreDiarioUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ cantidadBandejas: 1, cantidadSobrante: 0 }),
      })
    );
  });

  it("lanza AppError 409 si el total acumulado de una categoría es negativo", async () => {
    mockLogConteoFindMany.mockResolvedValue([
      { idGalpon: 1, codigoCategoriaPeso: "AA", cantidad: 1 },
      { idGalpon: 1, codigoCategoriaPeso: "AA", cantidad: -1 },
      { idGalpon: 1, codigoCategoriaPeso: "AA", cantidad: -1 },
    ]);

    await expect(closeDailyProduction({ fecha: "2026-09-25" })).rejects.toThrow(
      new AppError(409, "No se puede cerrar AA del galpón 1: el total es negativo")
    );
  });

  it("no llama a upsert si no hay conteos para el día", async () => {
    mockLogConteoFindMany.mockResolvedValue([]);

    const result = await closeDailyProduction({ fecha: "2026-09-25" });

    expect(mockCierreDiarioUpsert).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it("construye el rango de fecha correctamente (00:00:00Z al día siguiente 00:00:00Z)", async () => {
    mockLogConteoFindMany.mockResolvedValue([]);

    await closeDailyProduction({ fecha: "2026-09-25" });

    expect(mockLogConteoFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          timestamp: {
            gte: new Date("2026-09-25T00:00:00.000Z"),
            lt:  new Date("2026-09-26T00:00:00.000Z"),
          },
        }),
      })
    );
  });

  it("filtra por galponId cuando se proporciona", async () => {
    mockLogConteoFindMany.mockResolvedValue([]);

    await closeDailyProduction({ fecha: "2026-09-25", galponId: 3 });

    expect(mockLogConteoFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ idGalpon: 3 }),
      })
    );
  });

  it("no filtra por galponId cuando no se proporciona", async () => {
    mockLogConteoFindMany.mockResolvedValue([]);

    await closeDailyProduction({ fecha: "2026-09-25" });

    const callArg = mockLogConteoFindMany.mock.calls[0][0];
    expect(callArg.where).not.toHaveProperty("idGalpon");
  });
});
