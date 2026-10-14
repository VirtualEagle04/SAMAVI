import { prisma } from "../../database/prisma.js";
import { toDateOnly, todayBogota } from "../../shared/utils/fecha-bogota.js";
import { listCategorias } from "../produccion/produccion.service.js";

const WEEK_DAYS = 7;

type CantidadesPorCategoria = Record<string, number>;

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addCantidad(target: CantidadesPorCategoria, codigo: string, cantidad: number) {
  target[codigo] = (target[codigo] ?? 0) + cantidad;
}

/**
 * Resumen semanal con la forma de la planilla del cuaderno: bandejas por día,
 * galpón y categoría (de los cierres diarios), la bodega que quedó de la semana
 * anterior y, por categoría, lo disponible (producción + bodega), lo vendido y
 * lo que queda en bodega. Sin `desde`, toma los siete días que terminan en el
 * último cierre registrado.
 */
export async function getWeeklySummary(desde?: string) {
  let start: Date;
  if (desde) {
    start = toDateOnly(desde);
  } else {
    const ultimoCierre = await prisma.cierreDiario.findFirst({
      where: { fecha: { lte: toDateOnly(todayBogota()) } },
      orderBy: { fecha: "desc" },
      select: { fecha: true },
    });
    start = addDays(ultimoCierre?.fecha ?? toDateOnly(todayBogota()), -(WEEK_DAYS - 1));
  }
  const end = addDays(start, WEEK_DAYS - 1);
  const afterEnd = addDays(start, WEEK_DAYS);
  const fechas = Array.from({ length: WEEK_DAYS }, (_, index) => toIsoDay(addDays(start, index)));

  const [galpones, categorias, cierres, cortes, detallesVenta] = await Promise.all([
    prisma.galpon.findMany({ orderBy: { id: "asc" }, select: { id: true, nombre: true } }),
    listCategorias(),
    prisma.cierreDiario.findMany({ where: { fecha: { gte: start, lte: end } } }),
    // La bodega inicial es el último corte de la semana anterior.
    prisma.bodega.findMany({
      where: { fechaCorte: { gte: addDays(start, -WEEK_DAYS), lt: start } },
      orderBy: { fechaCorte: "desc" },
    }),
    prisma.detalleVenta.findMany({
      where: { venta: { fechaHora: { gte: start, lt: afterEnd } } },
      select: { codigoCategoriaPeso: true, cantidadVendida: true },
    }),
  ]);

  const fechaCorte = cortes[0]?.fechaCorte;
  const bodegaInicial = fechaCorte
    ? cortes.filter((corte) => corte.fechaCorte.getTime() === fechaCorte.getTime())
    : [];

  const ordenCategorias = categorias.map((categoria) => categoria.codigo);
  const disponible: CantidadesPorCategoria = {};

  const galponesResumen = galpones
    .map((galpon) => {
      const dias = fechas.map((fecha) => ({ fecha, cantidades: {} as CantidadesPorCategoria }));
      const bodega: CantidadesPorCategoria = {};
      const total: CantidadesPorCategoria = {};

      for (const cierre of cierres) {
        if (cierre.idGalpon !== galpon.id) continue;
        const dia = dias[fechas.indexOf(toIsoDay(cierre.fecha))];
        if (!dia) continue;
        addCantidad(dia.cantidades, cierre.codigoCategoriaPeso, cierre.cantidadBandejas);
        addCantidad(total, cierre.codigoCategoriaPeso, cierre.cantidadBandejas);
      }
      for (const corte of bodegaInicial) {
        if (corte.idGalpon !== galpon.id) continue;
        addCantidad(bodega, corte.codigoCategoriaPeso, corte.cantidadBandejas);
        addCantidad(total, corte.codigoCategoriaPeso, corte.cantidadBandejas);
      }
      for (const [codigo, cantidad] of Object.entries(total)) addCantidad(disponible, codigo, cantidad);

      const tieneDatos = Object.values(total).some((cantidad) => cantidad > 0);
      return { id: galpon.id, nombre: galpon.nombre, categorias: ordenCategorias, dias, bodegaInicial: bodega, total, tieneDatos };
    })
    // Los galpones sin cierres ni bodega en la semana (p. ej. inactivos) no se muestran.
    .filter((galpon) => galpon.tieneDatos)
    .map(({ tieneDatos: _tieneDatos, ...galpon }) => galpon);

  const vendido: CantidadesPorCategoria = {};
  for (const detalle of detallesVenta) addCantidad(vendido, detalle.codigoCategoriaPeso, detalle.cantidadVendida);

  return {
    desde: toIsoDay(start),
    hasta: toIsoDay(end),
    fechas,
    fechaCorteBodega: fechaCorte ? toIsoDay(fechaCorte) : null,
    galpones: galponesResumen,
    resumen: categorias.map((categoria) => {
      const produccion = disponible[categoria.codigo] ?? 0;
      const ventas = vendido[categoria.codigo] ?? 0;
      return {
        codigo: categoria.codigo,
        nombre: categoria.nombre,
        produccion,
        ventas,
        bodega: produccion - ventas,
      };
    }),
  };
}
