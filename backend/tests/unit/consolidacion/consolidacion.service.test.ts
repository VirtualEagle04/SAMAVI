import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  cerrarSemana,
  createGasto,
  deleteGasto,
  getHistorial,
  getSemana,
  reabrirSemana,
  viernesDeLaSemana,
} from "../../../src/modules/consolidacion/consolidacion.service.js";
import { prisma } from "../../../src/database/prisma.js";
import { getWeeklySummary } from "../../../src/modules/dashboard/dashboard.service.js";

vi.mock("../../../src/database/prisma.js", () => {
  const client = {
    galpon: { findMany: vi.fn(), count: vi.fn() },
    detalleVenta: { findMany: vi.fn() },
    movimientoInsumo: { findMany: vi.fn() },
    gasto: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
    inversionSocio: { findMany: vi.fn() },
    cierreSemanal: { findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), delete: vi.fn() },
    cierreDiario: { findMany: vi.fn() },
    auditoria: { create: vi.fn() },
    $executeRaw: vi.fn(),
    $transaction: vi.fn(),
  };
  client.$transaction.mockImplementation((callback: (tx: unknown) => unknown) => callback(client));
  return { prisma: client };
});

vi.mock("../../../src/modules/dashboard/dashboard.service.js", () => ({
  getWeeklySummary: vi.fn(),
}));

vi.mock("../../../src/modules/produccion/produccion.service.js", () => ({
  listCategorias: vi.fn().mockResolvedValue(["Y", "Ex", "AA", "A", "B", "C", "P", "Q"].map((codigo) => ({ codigo }))),
}));

const mocked = prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;
const mockWeeklySummary = getWeeklySummary as ReturnType<typeof vi.fn>;

const dia = (fecha: string) => new Date(`${fecha}T00:00:00.000Z`);
const decimal = (valor: number) => ({ toNumber: () => valor });
const SEMANA = ["2026-08-07", "2026-08-08", "2026-08-09", "2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13"];

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-13T20:00:00.000Z"));

  mocked.galpon!.findMany!.mockResolvedValue([
    { id: 1, nombre: "Galpón 1", estado: "activo" },
    { id: 2, nombre: "Galpón 2", estado: "inactivo" },
  ]);
  mocked.detalleVenta!.findMany!.mockResolvedValue([
    { codigoCategoriaPeso: "A", cantidadVendida: 10, precioAplicado: decimal(13000), distribuciones: [{ idGalpon: 1, cantidad: 10 }] },
  ]);
  mocked.movimientoInsumo!.findMany!.mockResolvedValue([
    {
      idGalpon: 1,
      cantidad: decimal(2),
      costoUnitario: decimal(10000),
      codigoTipoMovimiento: "CONSUMO_GALPON",
      insumo: { nombre: "Alimento", unidadMedida: "bulto" },
    },
    {
      idGalpon: 1,
      cantidad: decimal(0.5),
      costoUnitario: decimal(10000),
      codigoTipoMovimiento: "DEVOLUCION",
      insumo: { nombre: "Alimento", unidadMedida: "bulto" },
    },
  ]);
  mocked.gasto!.findMany!.mockResolvedValue([
    {
      id: 1,
      concepto: "Chana",
      valor: decimal(20000),
      fecha: dia("2026-08-13"),
      galpones: [{ idGalpon: 1, galpon: { id: 1, nombre: "Galpón 1" } }],
    },
  ]);
  mocked.inversionSocio!.findMany!.mockResolvedValue([
    { idSocio: 1, idGalpon: 1, porcentajeInversion: decimal(50), socio: { nombre: "Mauricio" } },
    { idSocio: 2, idGalpon: 1, porcentajeInversion: decimal(50), socio: { nombre: "J.C.V" } },
  ]);
  mocked.cierreSemanal!.findFirst!.mockResolvedValue(null);
  mocked.cierreSemanal!.findUnique!.mockResolvedValue(null);
  mocked.cierreSemanal!.create!.mockResolvedValue({ id: 7 });
  mocked.cierreDiario!.findMany!.mockResolvedValue(SEMANA.map((fecha) => ({ idGalpon: 1, fecha: dia(fecha) })));
  mockWeeklySummary.mockResolvedValue({ galpones: [{ id: 1, total: { A: 40 } }] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("viernesDeLaSemana", () => {
  it("lleva cualquier día al viernes en que empieza su semana", () => {
    expect(viernesDeLaSemana("2026-08-07")).toBe("2026-08-07");
    expect(viernesDeLaSemana("2026-08-13")).toBe("2026-08-07");
    expect(viernesDeLaSemana("2026-08-14")).toBe("2026-08-14");
  });
});

describe("getSemana", () => {
  it("calcula en vivo una semana abierta con límites del día en Bogotá", async () => {
    const result = await getSemana("2026-08-07");

    expect(mocked.detalleVenta!.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { venta: { fechaHora: { gte: new Date("2026-08-07T05:00:00.000Z"), lt: new Date("2026-08-14T05:00:00.000Z") } } },
    }));
    expect(result).toMatchObject({ desde: "2026-08-07", hasta: "2026-08-13", estado: "abierta", puedeCerrar: true, bloqueos: [] });
    // 130.000 de ventas - 15.000 de insumos - 20.000 de gastos.
    expect(result.totales).toMatchObject({ ingresos: 130000, insumos: 15000, gastos: 20000, resultado: 95000, repartido: 95000 });
    expect(result.socios).toEqual([
      { id: 1, nombre: "Mauricio", total: 47500, galpones: [{ id: 1, nombre: "Galpón 1", porcentaje: 50, valor: 47500 }] },
      { id: 2, nombre: "J.C.V", total: 47500, galpones: [{ id: 1, nombre: "Galpón 1", porcentaje: 50, valor: 47500 }] },
    ]);
  });

  it("incluye la hoja de cada galpón: ventas por precio, bodega, insumos y su parte de cada gasto", async () => {
    const result = await getSemana("2026-08-07");

    expect(result.galpones[0]).toMatchObject({
      ventas: [{ categoria: "A", precio: 13000, bandejas: 10, valor: 130000 }],
      bodega: [{ categoria: "A", disponible: 40, vendidas: 10, restante: 30 }],
      insumosDetalle: [{ concepto: "Alimento", unidad: "bulto", cantidad: 1.5, valor: 15000 }],
      gastosDetalle: [{ id: 1, concepto: "Chana", valor: 20000, compartido: false }],
    });
  });

  it("muestra una semana cerrada con el detalle guardado", async () => {
    mocked.cierreSemanal!.findUnique!.mockResolvedValue({
      cerradoEn: new Date("2026-08-13T22:00:00.000Z"),
      usuario: { nombre: "Administrador" },
      galpones: [{
        idGalpon: 1,
        galpon: { nombre: "Galpón 1" },
        ingresos: decimal(130000),
        insumos: decimal(15000),
        gastos: decimal(20000),
        resultado: decimal(95000),
        deudaAnterior: decimal(0),
        abonoDeuda: decimal(0),
        deudaFinal: decimal(0),
        repartible: decimal(95000),
        detalle: { ventas: [{ categoria: "A", precio: 13000, bandejas: 10, valor: 130000 }], insumos: [], disponible: { A: 40 } },
        socios: [],
      }],
    });

    const result = await getSemana("2026-08-07");

    expect(result.estado).toBe("cerrada");
    expect(mocked.detalleVenta!.findMany).not.toHaveBeenCalled();
    expect(result.galpones[0]).toMatchObject({
      ventas: [{ categoria: "A", precio: 13000, bandejas: 10, valor: 130000 }],
      bodega: [{ categoria: "A", disponible: 40, vendidas: 10, restante: 30 }],
    });
  });

  it("bloquea si la semana no ha terminado o faltan cierres diarios", async () => {
    vi.setSystemTime(new Date("2026-08-12T20:00:00.000Z"));
    mocked.cierreDiario!.findMany!.mockResolvedValue([{ idGalpon: 1, fecha: dia("2026-08-07") }]);

    const result = await getSemana("2026-08-07");

    expect(result.puedeCerrar).toBe(false);
    expect(result.bloqueos).toContain("La semana termina el 2026-08-13; se puede cerrar desde ese día");
    expect(result.bloqueos).toContain(
      "Galpón 1 no tiene cierre diario el 2026-08-08, 2026-08-09, 2026-08-10, 2026-08-11, 2026-08-12, 2026-08-13",
    );
  });

  it("exige cerrar antes la semana anterior si ya hay cierres", async () => {
    mocked.cierreSemanal!.findFirst!.mockImplementation(({ where }: { where: { desde: { lt?: Date } } }) =>
      Promise.resolve(where.desde.lt ? { desde: dia("2026-07-24"), galpones: [] } : null),
    );

    const result = await getSemana("2026-08-07");

    expect(result.bloqueos).toContain("Primero se debe cerrar la semana del 2026-07-31");
  });
});

describe("cerrarSemana", () => {
  it("guarda el resultado por galpón y socio y lo audita", async () => {
    await cerrarSemana("2026-08-07", { userId: 9, ip: "127.0.0.1" });

    expect(mocked.cierreSemanal!.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        desde: dia("2026-08-07"),
        hasta: dia("2026-08-13"),
        totalRepartido: 95000,
        idUsuario: 9,
        galpones: {
          create: [expect.objectContaining({
            idGalpon: 1,
            ingresos: 130000,
            repartible: 95000,
            detalle: {
              ventas: [{ categoria: "A", precio: 13000, bandejas: 10, valor: 130000 }],
              insumos: [{ concepto: "Alimento", unidad: "bulto", cantidad: 1.5, valor: 15000 }],
              disponible: { A: 40 },
            },
            socios: {
              create: [
                { idSocio: 1, porcentajeInversion: 50, valor: 47500 },
                { idSocio: 2, porcentajeInversion: 50, valor: 47500 },
              ],
            },
          })],
        },
      }),
    });
    expect(mocked.auditoria!.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ tablaAfectada: "cierre_semanal", idRegistroAfectado: "7", accion: "INSERT" }),
    });
  });

  it("rechaza el cierre si hay bloqueos", async () => {
    mocked.cierreDiario!.findMany!.mockResolvedValue([]);

    await expect(cerrarSemana("2026-08-07", { userId: 9, ip: undefined })).rejects.toMatchObject({ statusCode: 409 });
    expect(mocked.cierreSemanal!.create).not.toHaveBeenCalled();
  });

  it("rechaza una semana ya cerrada", async () => {
    mocked.cierreSemanal!.findUnique!.mockResolvedValue({ id: 3 });

    await expect(cerrarSemana("2026-08-07", { userId: 9, ip: undefined })).rejects.toMatchObject({
      statusCode: 409,
      message: "La semana del 2026-08-07 ya está cerrada",
    });
  });
});

describe("getHistorial", () => {
  it("usa los cierres guardados y calcula en vivo las semanas abiertas", async () => {
    mocked.cierreSemanal!.findMany!.mockResolvedValue([{
      desde: dia("2026-07-31"),
      galpones: [{
        idGalpon: 1,
        galpon: { nombre: "Galpón 1" },
        ingresos: decimal(100000),
        insumos: decimal(10000),
        gastos: decimal(30000),
        resultado: decimal(60000),
      }],
    }]);

    const result = await getHistorial("2026-08-10", 2);

    expect(mocked.cierreSemanal!.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { desde: { in: [dia("2026-07-31"), dia("2026-08-07")] } },
    }));
    expect(result).toEqual([
      {
        desde: "2026-07-31",
        hasta: "2026-08-06",
        estado: "cerrada",
        ingresos: 100000,
        egresos: 40000,
        resultado: 60000,
        galpones: [{ id: 1, nombre: "Galpón 1", ingresos: 100000, egresos: 40000, resultado: 60000 }],
      },
      {
        desde: "2026-08-07",
        hasta: "2026-08-13",
        estado: "abierta",
        ingresos: 130000,
        egresos: 35000,
        resultado: 95000,
        galpones: [{ id: 1, nombre: "Galpón 1", ingresos: 130000, egresos: 35000, resultado: 95000 }],
      },
    ]);
  });
});

describe("reabrirSemana", () => {
  it("solo permite reabrir el último cierre", async () => {
    mocked.cierreSemanal!.findUnique!.mockResolvedValue({ id: 3, desde: dia("2026-08-07") });
    mocked.cierreSemanal!.findFirst!.mockResolvedValue({ id: 4 });

    await expect(reabrirSemana("2026-08-07", { userId: 9, ip: undefined })).rejects.toMatchObject({
      statusCode: 409,
      message: "Solo se puede reabrir el último cierre semanal",
    });
    expect(mocked.cierreSemanal!.delete).not.toHaveBeenCalled();
  });
});

describe("createGasto", () => {
  it("no permite registrar gastos en una semana cerrada", async () => {
    mocked.cierreSemanal!.findUnique!.mockResolvedValue({ id: 3 });

    await expect(createGasto({ concepto: "Chana", valor: 1000, fecha: "2026-08-10", galponIds: [1] }, { userId: 9, ip: undefined })).rejects.toMatchObject({
      statusCode: 409,
      message: "La semana del 2026-08-07 ya está cerrada",
    });
    expect(mocked.cierreSemanal!.findUnique).toHaveBeenCalledWith({ where: { desde: dia("2026-08-07") }, select: { id: true } });
    expect(mocked.gasto!.create).not.toHaveBeenCalled();
  });
});

describe("deleteGasto", () => {
  it("audita el gasto borrado con sus datos", async () => {
    mocked.cierreSemanal!.findUnique!.mockResolvedValue(null);
    mocked.gasto!.findUnique!.mockResolvedValue({
      concepto: "Chana",
      valor: { toNumber: () => 1000 },
      fecha: dia("2026-08-10"),
      galpones: [{ idGalpon: 1 }, { idGalpon: 2 }],
    });

    await deleteGasto(5, { userId: 9, ip: undefined });

    expect(mocked.gasto!.delete).toHaveBeenCalledWith({ where: { id: 5 } });
    expect(mocked.auditoria!.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        idUsuario: 9,
        tablaAfectada: "gasto",
        idRegistroAfectado: "5",
        accion: "DELETE",
        datosAnteriores: { concepto: "Chana", valor: 1000, fecha: "2026-08-10", galponIds: [1, 2] },
      }),
    });
  });
});
