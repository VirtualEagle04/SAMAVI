import { describe, it, expect, vi, beforeEach } from "vitest";
import { getWeeklySummary } from "../../../src/modules/dashboard/dashboard.service.js";
import { prisma } from "../../../src/database/prisma.js";

vi.mock("../../../src/database/prisma.js", () => ({
  prisma: {
    galpon: { findMany: vi.fn() },
    categoriaPeso: { findMany: vi.fn() },
    cierreDiario: { findMany: vi.fn(), findFirst: vi.fn() },
    bodega: { findMany: vi.fn() },
    detalleVenta: { findMany: vi.fn() },
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

const mockGalponFindMany = prisma.galpon.findMany as ReturnType<typeof vi.fn>;
const mockCategoriaFindMany = prisma.categoriaPeso.findMany as ReturnType<typeof vi.fn>;
const mockCierreDiarioFindMany = prisma.cierreDiario.findMany as ReturnType<typeof vi.fn>;
const mockCierreDiarioFindFirst = prisma.cierreDiario.findFirst as ReturnType<typeof vi.fn>;
const mockBodegaFindMany = prisma.bodega.findMany as ReturnType<typeof vi.fn>;
const mockDetalleVentaFindMany = prisma.detalleVenta.findMany as ReturnType<typeof vi.fn>;

const dia = (fecha: string) => new Date(`${fecha}T00:00:00.000Z`);

beforeEach(() => {
  vi.clearAllMocks();
  mockGalponFindMany.mockResolvedValue([
    { id: 1, nombre: "Galpón 1" },
    { id: 2, nombre: "Galpón 2" },
    { id: 5, nombre: "Galpón 5" },
  ]);
  mockCategoriaFindMany.mockResolvedValue([
    { codigo: "B", nombre: "B" },
    { codigo: "Y", nombre: "Yumbo" },
    { codigo: "A", nombre: "A" },
    { codigo: "Q", nombre: "Quebrado" },
  ]);
  mockCierreDiarioFindMany.mockResolvedValue([
    { idGalpon: 1, codigoCategoriaPeso: "A", fecha: dia("2026-08-07"), cantidadBandejas: 23 },
    { idGalpon: 1, codigoCategoriaPeso: "A", fecha: dia("2026-08-13"), cantidadBandejas: 20 },
    { idGalpon: 1, codigoCategoriaPeso: "Q", fecha: dia("2026-08-07"), cantidadBandejas: 1 },
    { idGalpon: 5, codigoCategoriaPeso: "B", fecha: dia("2026-08-09"), cantidadBandejas: 1 },
  ]);
  mockBodegaFindMany.mockResolvedValue([
    { idGalpon: 1, codigoCategoriaPeso: "A", fechaCorte: dia("2026-08-06"), cantidadBandejas: 14 },
    { idGalpon: 1, codigoCategoriaPeso: "Y", fechaCorte: dia("2026-08-06"), cantidadBandejas: 1 },
    { idGalpon: 1, codigoCategoriaPeso: "A", fechaCorte: dia("2026-08-02"), cantidadBandejas: 99 },
  ]);
  mockDetalleVentaFindMany.mockResolvedValue([
    { codigoCategoriaPeso: "A", cantidadVendida: 40 },
    { codigoCategoriaPeso: "A", cantidadVendida: 10 },
    { codigoCategoriaPeso: "Y", cantidadVendida: 1 },
  ]);
});

describe("dashboard.service → getWeeklySummary()", () => {
  it("arma la semana de siete días desde la fecha indicada", async () => {
    const result = await getWeeklySummary("2026-08-07");

    expect(result.desde).toBe("2026-08-07");
    expect(result.hasta).toBe("2026-08-13");
    expect(result.fechas).toHaveLength(7);
    expect(mockCierreDiarioFindFirst).not.toHaveBeenCalled();
    expect(mockCierreDiarioFindMany).toHaveBeenCalledWith({
      where: { fecha: { gte: dia("2026-08-07"), lte: dia("2026-08-13") } },
    });
  });

  it("suma la bodega del último corte anterior a la semana en el total del galpón", async () => {
    const result = await getWeeklySummary("2026-08-07");
    const galpon1 = result.galpones.find((galpon) => galpon.id === 1);

    expect(result.fechaCorteBodega).toBe("2026-08-06");
    expect(galpon1?.bodegaInicial).toEqual({ A: 14, Y: 1 });
    expect(galpon1?.total).toEqual({ A: 57, Q: 1, Y: 1 });
    expect(galpon1?.dias[0].cantidades).toEqual({ A: 23, Q: 1 });
    expect(galpon1?.dias[6].cantidades).toEqual({ A: 20 });
  });

  it("muestra todas las categorías en cada galpón y omite galpones sin datos", async () => {
    const result = await getWeeklySummary("2026-08-07");

    expect(result.galpones.map((galpon) => galpon.id)).toEqual([1, 5]);
    expect(result.galpones[0].categorias).toEqual(["Y", "A", "B", "Q"]);
    expect(result.galpones[1].categorias).toEqual(["Y", "A", "B", "Q"]);
  });

  it("calcula producción, ventas y bodega final por categoría", async () => {
    const result = await getWeeklySummary("2026-08-07");

    expect(result.resumen).toEqual([
      { codigo: "Y", nombre: "Yumbo", produccion: 1, ventas: 1, bodega: 0 },
      { codigo: "A", nombre: "A", produccion: 57, ventas: 50, bodega: 7 },
      { codigo: "B", nombre: "B", produccion: 1, ventas: 0, bodega: 1 },
      { codigo: "Q", nombre: "Quebrado", produccion: 1, ventas: 0, bodega: 1 },
    ]);
  });

  it("sin fecha toma los siete días que terminan en el último cierre", async () => {
    mockCierreDiarioFindFirst.mockResolvedValue({ fecha: dia("2026-08-13") });

    const result = await getWeeklySummary();

    expect(result.desde).toBe("2026-08-07");
    expect(result.hasta).toBe("2026-08-13");
  });
});
