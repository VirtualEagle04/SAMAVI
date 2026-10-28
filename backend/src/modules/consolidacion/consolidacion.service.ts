import type { Prisma } from "@prisma/client";
import { prisma } from "../../database/prisma.js";
import { type AuditContext, registrarAuditoria } from "../../shared/audit/auditoria.js";
import { AppError } from "../../shared/errors/app-error.js";
import { startOfDayBogota, toDateOnly, todayBogota } from "../../shared/utils/fecha-bogota.js";
import { getWeeklySummary } from "../dashboard/dashboard.service.js";
import { listCategorias } from "../produccion/produccion.service.js";
import {
  aCentavos,
  aPesos,
  calcularConsolidacion,
  repartirProporcional,
  type IngresoGalpon,
  type InsumoGalpon,
  type RepartoSocio,
} from "./consolidacion.calculo.js";
import type { GastoInput } from "./consolidacion.schemas.js";

type Reader = Prisma.TransactionClient;

const DIAS_SEMANA = 7;
const VIERNES = 5;
// Solo lo entregado a un galpón (menos lo que devuelve) es gasto directo del galpón.
const MOVIMIENTO_CONSUMO = "CONSUMO_GALPON";
const MOVIMIENTO_DEVOLUCION = "DEVOLUCION";
const LOCK_CIERRE_SEMANAL = 74129032;

const gastoInclude = {
  galpones: {
    include: { galpon: { select: { id: true, nombre: true } } },
    orderBy: { idGalpon: "asc" },
  },
} satisfies Prisma.GastoInclude;

type GastoConGalpones = Prisma.GastoGetPayload<{ include: typeof gastoInclude }>;

/** Detalle de un galpón en la semana; se guarda como foto al cerrar. */
type DetalleGalpon = {
  ventas: IngresoGalpon[];
  insumosDetalle: InsumoGalpon[];
  disponible: Record<string, number>;
};

type GalponCierre = DetalleGalpon & {
  id: number;
  nombre: string;
  ingresos: number;
  /** Parte del ingreso estimada por prorrateo; no se conserva al cerrar. */
  ingresosProrrateados: number | null;
  insumos: number;
  gastos: number;
  resultado: number;
  deudaAnterior: number;
  abonoDeuda: number;
  deudaFinal: number;
  repartible: number;
  socios: RepartoSocio[];
};

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function moverDias(fecha: string, dias: number): string {
  return toIsoDay(addDays(toDateOnly(fecha), dias));
}

/** El detalle se guarda en pesos, como el resto de valores del cierre. */
function detalleAJson(galpon: DetalleGalpon): Prisma.InputJsonObject {
  return {
    ventas: galpon.ventas.map((linea) => ({
      categoria: linea.categoria,
      precio: aPesos(linea.precioCentavos),
      bandejas: linea.bandejas,
      valor: aPesos(linea.centavos),
    })),
    insumos: galpon.insumosDetalle.map((linea) => ({
      concepto: linea.concepto,
      unidad: linea.unidad,
      cantidad: linea.cantidad,
      valor: aPesos(linea.centavos),
    })),
    disponible: galpon.disponible,
  };
}

function esObjeto(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const numero = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : 0);
const texto = (value: unknown) => (typeof value === "string" ? value : "");

/** Lee el detalle guardado; un cierre sin detalle (o con uno inválido) se muestra vacío. */
function detalleDesdeJson(json: Prisma.JsonValue): DetalleGalpon {
  const detalle = esObjeto(json) ? json : {};
  const lista = (value: unknown) => (Array.isArray(value) ? value.filter(esObjeto) : []);
  const disponible: Record<string, number> = {};
  if (esObjeto(detalle.disponible)) {
    for (const [codigo, cantidad] of Object.entries(detalle.disponible)) disponible[codigo] = numero(cantidad);
  }
  return {
    ventas: lista(detalle.ventas).map((linea) => ({
      categoria: texto(linea.categoria),
      precioCentavos: aCentavos(numero(linea.precio)),
      bandejas: numero(linea.bandejas),
      centavos: aCentavos(numero(linea.valor)),
    })),
    insumosDetalle: lista(detalle.insumos).map((linea) => ({
      concepto: texto(linea.concepto),
      unidad: texto(linea.unidad),
      cantidad: numero(linea.cantidad),
      centavos: aCentavos(numero(linea.valor)),
    })),
    disponible,
  };
}

/** Viernes con el que empieza la semana productiva (viernes a jueves) de una fecha. */
export function viernesDeLaSemana(fecha: string): string {
  const retroceso = (toDateOnly(fecha).getUTCDay() - VIERNES + DIAS_SEMANA) % DIAS_SEMANA;
  return moverDias(fecha, -retroceso);
}

async function bloquearCierres(reader: Reader): Promise<void> {
  await reader.$executeRaw`SELECT pg_advisory_xact_lock(${LOCK_CIERRE_SEMANAL})`;
}

async function assertSemanaAbierta(reader: Reader, fecha: string): Promise<void> {
  const desde = viernesDeLaSemana(fecha);
  const cierre = await reader.cierreSemanal.findUnique({ where: { desde: toDateOnly(desde) }, select: { id: true } });
  if (cierre) {
    throw new AppError(409, `La semana del ${desde} ya está cerrada`);
  }
}

function gastoResponse(gasto: GastoConGalpones) {
  const centavos = aCentavos(gasto.valor);
  const partes = repartirProporcional(centavos, gasto.galpones.map(() => 1));
  return {
    id: gasto.id,
    concepto: gasto.concepto,
    valor: aPesos(centavos),
    fecha: toIsoDay(gasto.fecha),
    galpones: gasto.galpones.map((row, index) => ({
      id: row.galpon.id,
      nombre: row.galpon.nombre,
      valor: aPesos(partes[index] ?? 0),
    })),
  };
}

export async function listGastos(desde: string) {
  const gastos = await prisma.gasto.findMany({
    where: { fecha: { gte: toDateOnly(desde), lte: toDateOnly(moverDias(desde, DIAS_SEMANA - 1)) } },
    include: gastoInclude,
    orderBy: [{ fecha: "asc" }, { id: "asc" }],
  });
  return gastos.map(gastoResponse);
}

export async function createGasto(input: GastoInput, context: AuditContext) {
  return prisma.$transaction(async (transaction) => {
    await bloquearCierres(transaction);
    await assertSemanaAbierta(transaction, input.fecha);
    const galpones = await transaction.galpon.count({ where: { id: { in: input.galponIds } } });
    if (galpones !== input.galponIds.length) {
      throw new AppError(404, "Uno o más galpones no existen");
    }
    const gasto = await transaction.gasto.create({
      data: {
        concepto: input.concepto,
        valor: input.valor,
        fecha: toDateOnly(input.fecha),
        idUsuario: context.userId,
        galpones: { create: input.galponIds.map((idGalpon) => ({ idGalpon })) },
      },
      include: gastoInclude,
    });
    await registrarAuditoria(transaction, context, {
      tabla: "gasto",
      idRegistro: gasto.id,
      accion: "INSERT",
      despues: { concepto: input.concepto, valor: input.valor, fecha: input.fecha, galponIds: input.galponIds },
    });
    return gastoResponse(gasto);
  });
}

export async function deleteGasto(id: number, context: AuditContext): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    await bloquearCierres(transaction);
    const gasto = await transaction.gasto.findUnique({
      where: { id },
      select: { concepto: true, valor: true, fecha: true, galpones: { select: { idGalpon: true } } },
    });
    if (!gasto) {
      throw new AppError(404, "Gasto no encontrado");
    }
    const fecha = toIsoDay(gasto.fecha);
    await assertSemanaAbierta(transaction, fecha);
    await transaction.gasto.delete({ where: { id } });
    await registrarAuditoria(transaction, context, {
      tabla: "gasto",
      idRegistro: id,
      accion: "DELETE",
      antes: {
        concepto: gasto.concepto,
        valor: gasto.valor.toNumber(),
        fecha,
        galponIds: gasto.galpones.map((row) => row.idGalpon),
      },
    });
  });
}

export async function listSocios() {
  const socios = await prisma.socio.findMany({
    orderBy: { id: "asc" },
    include: { inversiones: { include: { galpon: { select: { nombre: true } } }, orderBy: { idGalpon: "asc" } } },
  });
  return socios.map((socio) => ({
    id: socio.id,
    nombre: socio.nombre,
    inversiones: socio.inversiones.map((inversion) => ({
      idGalpon: inversion.idGalpon,
      galpon: inversion.galpon.nombre,
      porcentaje: inversion.porcentajeInversion.toNumber(),
    })),
  }));
}

/** Reúne los datos de la semana, aplica las reglas de proceso y calcula el reparto. */
async function calcularSemana(reader: Reader, desde: string) {
  const hasta = moverDias(desde, DIAS_SEMANA - 1);
  const inicio = startOfDayBogota(desde);
  const fin = startOfDayBogota(moverDias(desde, DIAS_SEMANA));

  const [galpones, ventas, movimientos, gastos, inversiones, anterior, posterior, diasCerrados, produccion] = await Promise.all([
    reader.galpon.findMany({ orderBy: { id: "asc" }, select: { id: true, nombre: true, estado: true } }),
    reader.detalleVenta.findMany({
      where: { venta: { fechaHora: { gte: inicio, lt: fin } } },
      select: {
        codigoCategoriaPeso: true,
        cantidadVendida: true,
        precioAplicado: true,
        distribuciones: { select: { idGalpon: true, cantidad: true } },
      },
    }),
    reader.movimientoInsumo.findMany({
      where: {
        fecha: { gte: inicio, lt: fin },
        idGalpon: { not: null },
        codigoTipoMovimiento: { in: [MOVIMIENTO_CONSUMO, MOVIMIENTO_DEVOLUCION] },
      },
      select: {
        idGalpon: true,
        cantidad: true,
        costoUnitario: true,
        codigoTipoMovimiento: true,
        insumo: { select: { nombre: true, unidadMedida: true } },
      },
    }),
    reader.gasto.findMany({
      where: { fecha: { gte: toDateOnly(desde), lte: toDateOnly(hasta) } },
      include: gastoInclude,
      orderBy: [{ fecha: "asc" }, { id: "asc" }],
    }),
    reader.inversionSocio.findMany({ include: { socio: { select: { nombre: true } } } }),
    reader.cierreSemanal.findFirst({
      where: { desde: { lt: toDateOnly(desde) } },
      orderBy: { desde: "desc" },
      include: { galpones: { select: { idGalpon: true, deudaFinal: true } } },
    }),
    reader.cierreSemanal.findFirst({
      where: { desde: { gt: toDateOnly(desde) } },
      orderBy: { desde: "asc" },
      select: { desde: true },
    }),
    reader.cierreDiario.findMany({
      where: { fecha: { gte: toDateOnly(desde), lte: toDateOnly(hasta) } },
      select: { idGalpon: true, fecha: true },
      distinct: ["idGalpon", "fecha"],
    }),
    getWeeklySummary(desde),
  ]);

  const calculo = calcularConsolidacion({
    galpones: galpones.map((galpon) => ({ id: galpon.id, nombre: galpon.nombre, activo: galpon.estado === "activo" })),
    ventas: ventas.map((detalle) => ({
      categoria: detalle.codigoCategoriaPeso,
      cantidadVendida: detalle.cantidadVendida,
      precioCentavos: aCentavos(detalle.precioAplicado),
      distribucion: detalle.distribuciones,
    })),
    disponible: new Map(produccion.galpones.map((galpon) => [galpon.id, galpon.total])),
    insumos: movimientos.map((movimiento) => {
      const cantidad = movimiento.cantidad.toNumber();
      const centavos = aCentavos(cantidad * (movimiento.costoUnitario?.toNumber() ?? 0));
      const signo = movimiento.codigoTipoMovimiento === MOVIMIENTO_DEVOLUCION ? -1 : 1;
      return {
        idGalpon: movimiento.idGalpon!,
        concepto: movimiento.insumo.nombre,
        unidad: movimiento.insumo.unidadMedida,
        cantidad: signo * cantidad,
        centavos: signo * centavos,
      };
    }),
    gastos: gastos.map((gasto) => ({
      id: gasto.id,
      centavos: aCentavos(gasto.valor),
      galpones: gasto.galpones.map((row) => row.idGalpon),
    })),
    inversiones: inversiones.map((inversion) => ({
      idSocio: inversion.idSocio,
      nombre: inversion.socio.nombre,
      idGalpon: inversion.idGalpon,
      puntosBasicos: Math.round(inversion.porcentajeInversion.toNumber() * 100),
    })),
    deudaAnterior: new Map((anterior?.galpones ?? []).map((row) => [row.idGalpon, aCentavos(row.deudaFinal)])),
  });

  const bloqueos: string[] = [];
  if (hasta > todayBogota()) {
    bloqueos.push(`La semana termina el ${hasta}; se puede cerrar desde ese día`);
  }
  const semanaAnterior = moverDias(desde, -DIAS_SEMANA);
  if (anterior && toIsoDay(anterior.desde) !== semanaAnterior) {
    bloqueos.push(`Primero se debe cerrar la semana del ${semanaAnterior}`);
  }
  if (posterior) {
    bloqueos.push(`Ya existe un cierre posterior (semana del ${toIsoDay(posterior.desde)})`);
  }
  const cerrados = new Set(diasCerrados.map((row) => `${row.idGalpon}:${toIsoDay(row.fecha)}`));
  const fechas = Array.from({ length: DIAS_SEMANA }, (_, index) => moverDias(desde, index));
  for (const galpon of galpones) {
    if (galpon.estado !== "activo") continue;
    const faltantes = fechas.filter((fecha) => !cerrados.has(`${galpon.id}:${fecha}`));
    if (faltantes.length) {
      bloqueos.push(`${galpon.nombre} no tiene cierre diario el ${faltantes.join(", ")}`);
    }
  }

  return {
    hasta,
    calculo,
    gastos: gastos.map(gastoResponse),
    bloqueos: [...bloqueos, ...calculo.bloqueos],
  };
}

/**
 * Detalle del galpón como en la hoja del cuaderno: bandejas por categoría y
 * precio, bodega por categoría, insumos y su parte de cada gasto.
 */
function hojaGalpon(galpon: GalponCierre, orden: string[], gastos: ReturnType<typeof gastoResponse>[]) {
  const posicion = (codigo: string) => {
    const index = orden.indexOf(codigo);
    return index === -1 ? orden.length : index;
  };
  const vendidas: Record<string, number> = {};
  for (const linea of galpon.ventas) vendidas[linea.categoria] = (vendidas[linea.categoria] ?? 0) + linea.bandejas;
  const categorias = [...new Set([...Object.keys(galpon.disponible), ...Object.keys(vendidas)])]
    .filter((codigo) => (galpon.disponible[codigo] ?? 0) !== 0 || (vendidas[codigo] ?? 0) !== 0)
    .sort((a, b) => posicion(a) - posicion(b));

  return {
    ventas: [...galpon.ventas]
      .sort((a, b) => posicion(a.categoria) - posicion(b.categoria) || a.precioCentavos - b.precioCentavos)
      .map((linea) => ({
        categoria: linea.categoria,
        precio: aPesos(linea.precioCentavos),
        bandejas: linea.bandejas,
        valor: aPesos(linea.centavos),
      })),
    bodega: categorias.map((codigo) => {
      const disponible = galpon.disponible[codigo] ?? 0;
      const vendido = vendidas[codigo] ?? 0;
      return { categoria: codigo, disponible, vendidas: vendido, restante: disponible - vendido };
    }),
    insumosDetalle: galpon.insumosDetalle.map((linea) => ({
      concepto: linea.concepto,
      unidad: linea.unidad,
      cantidad: linea.cantidad,
      valor: aPesos(linea.centavos),
    })),
    gastosDetalle: gastos.flatMap((gasto) =>
      gasto.galpones
        .filter((parte) => parte.id === galpon.id)
        .map((parte) => ({ id: gasto.id, concepto: gasto.concepto, valor: parte.valor, compartido: gasto.galpones.length > 1 })),
    ),
  };
}

function semanaResponse(params: {
  desde: string;
  estado: "abierta" | "cerrada";
  cerradoEn: Date | null;
  cerradoPor: string | null;
  galpones: GalponCierre[];
  ingresosSinAsignar: number;
  gastos: ReturnType<typeof gastoResponse>[];
  advertencias: string[];
  bloqueos: string[];
  ordenCategorias: string[];
}) {
  const sumar = (campo: "ingresos" | "insumos" | "gastos" | "resultado" | "repartible" | "deudaFinal") =>
    aPesos(params.galpones.reduce((suma, galpon) => suma + galpon[campo], 0));

  const socios = new Map<number, { id: number; nombre: string; centavos: number; galpones: Array<{ id: number; nombre: string; porcentaje: number; valor: number }> }>();
  for (const galpon of params.galpones) {
    for (const reparto of galpon.socios) {
      const socio = socios.get(reparto.idSocio) ?? { id: reparto.idSocio, nombre: reparto.nombre, centavos: 0, galpones: [] };
      socio.centavos += reparto.centavos;
      socio.galpones.push({
        id: galpon.id,
        nombre: galpon.nombre,
        porcentaje: reparto.puntosBasicos / 100,
        valor: aPesos(reparto.centavos),
      });
      socios.set(reparto.idSocio, socio);
    }
  }

  return {
    desde: params.desde,
    hasta: moverDias(params.desde, DIAS_SEMANA - 1),
    estado: params.estado,
    cerradoEn: params.cerradoEn,
    cerradoPor: params.cerradoPor,
    puedeCerrar: params.estado === "abierta" && params.bloqueos.length === 0,
    totales: {
      ingresos: sumar("ingresos"),
      insumos: sumar("insumos"),
      gastos: sumar("gastos"),
      resultado: sumar("resultado"),
      repartido: sumar("repartible"),
      deudaFinal: sumar("deudaFinal"),
      ingresosSinAsignar: aPesos(params.ingresosSinAsignar),
    },
    galpones: params.galpones.map((galpon) => ({
      id: galpon.id,
      nombre: galpon.nombre,
      ingresos: aPesos(galpon.ingresos),
      ingresosProrrateados: galpon.ingresosProrrateados === null ? null : aPesos(galpon.ingresosProrrateados),
      insumos: aPesos(galpon.insumos),
      gastos: aPesos(galpon.gastos),
      resultado: aPesos(galpon.resultado),
      deudaAnterior: aPesos(galpon.deudaAnterior),
      abonoDeuda: aPesos(galpon.abonoDeuda),
      deudaFinal: aPesos(galpon.deudaFinal),
      repartible: aPesos(galpon.repartible),
      socios: galpon.socios.map((reparto) => ({
        id: reparto.idSocio,
        nombre: reparto.nombre,
        porcentaje: reparto.puntosBasicos / 100,
        valor: aPesos(reparto.centavos),
      })),
      ...hojaGalpon(galpon, params.ordenCategorias, params.gastos),
    })),
    socios: [...socios.values()]
      .sort((a, b) => a.id - b.id)
      .map(({ centavos, ...socio }) => ({ ...socio, total: aPesos(centavos) })),
    gastos: params.gastos,
    advertencias: params.advertencias,
    bloqueos: params.bloqueos,
  };
}

const cierreInclude = {
  usuario: { select: { nombre: true } },
  galpones: {
    include: {
      galpon: { select: { nombre: true } },
      socios: { include: { socio: { select: { nombre: true } } }, orderBy: { idSocio: "asc" } },
    },
    orderBy: { idGalpon: "asc" },
  },
} satisfies Prisma.CierreSemanalInclude;

/** Semana cerrada con los valores guardados, o semana abierta calculada en vivo. */
export async function getSemana(desde: string) {
  const [cierre, categorias] = await Promise.all([
    prisma.cierreSemanal.findUnique({ where: { desde: toDateOnly(desde) }, include: cierreInclude }),
    listCategorias(),
  ]);
  const ordenCategorias = categorias.map((categoria) => categoria.codigo);
  if (cierre) {
    const gastos = await listGastos(desde);
    return semanaResponse({
      desde,
      estado: "cerrada",
      cerradoEn: cierre.cerradoEn,
      cerradoPor: cierre.usuario.nombre,
      ordenCategorias,
      galpones: cierre.galpones.map((row) => ({
        id: row.idGalpon,
        nombre: row.galpon.nombre,
        ...detalleDesdeJson(row.detalle),
        ingresos: aCentavos(row.ingresos),
        ingresosProrrateados: null,
        insumos: aCentavos(row.insumos),
        gastos: aCentavos(row.gastos),
        resultado: aCentavos(row.resultado),
        deudaAnterior: aCentavos(row.deudaAnterior),
        abonoDeuda: aCentavos(row.abonoDeuda),
        deudaFinal: aCentavos(row.deudaFinal),
        repartible: aCentavos(row.repartible),
        socios: row.socios.map((reparto) => ({
          idSocio: reparto.idSocio,
          nombre: reparto.socio.nombre,
          puntosBasicos: Math.round(reparto.porcentajeInversion.toNumber() * 100),
          centavos: aCentavos(reparto.valor),
        })),
      })),
      ingresosSinAsignar: 0,
      gastos,
      advertencias: [],
      bloqueos: [],
    });
  }

  const { calculo, gastos, bloqueos } = await calcularSemana(prisma, desde);
  return semanaResponse({
    desde,
    estado: "abierta",
    cerradoEn: null,
    cerradoPor: null,
    ordenCategorias,
    galpones: calculo.galpones,
    ingresosSinAsignar: calculo.ingresosSinAsignar,
    gastos,
    advertencias: calculo.advertencias,
    bloqueos,
  });
}

/**
 * Ingresos, egresos (insumos + gastos) y resultado por galpón de las `semanas`
 * semanas que terminan en la de `hasta`: los cierres guardados y, para las
 * semanas abiertas, el cálculo en vivo.
 */
export async function getHistorial(hasta: string, semanas: number) {
  const ultima = viernesDeLaSemana(hasta);
  const desdes = Array.from({ length: semanas }, (_, index) => moverDias(ultima, -DIAS_SEMANA * (semanas - 1 - index)));
  const cierres = await prisma.cierreSemanal.findMany({
    where: { desde: { in: desdes.map(toDateOnly) } },
    include: { galpones: { include: { galpon: { select: { nombre: true } } }, orderBy: { idGalpon: "asc" } } },
  });
  const porDesde = new Map(cierres.map((cierre) => [toIsoDay(cierre.desde), cierre]));

  return Promise.all(
    desdes.map(async (desde) => {
      const cierre = porDesde.get(desde);
      const galpones = cierre
        ? cierre.galpones.map((row) => ({
            id: row.idGalpon,
            nombre: row.galpon.nombre,
            ingresos: aCentavos(row.ingresos),
            egresos: aCentavos(row.insumos) + aCentavos(row.gastos),
            resultado: aCentavos(row.resultado),
          }))
        : (await calcularSemana(prisma, desde)).calculo.galpones.map((galpon) => ({
            id: galpon.id,
            nombre: galpon.nombre,
            ingresos: galpon.ingresos,
            egresos: galpon.insumos + galpon.gastos,
            resultado: galpon.resultado,
          }));
      const total = (campo: "ingresos" | "egresos" | "resultado") =>
        aPesos(galpones.reduce((suma, galpon) => suma + galpon[campo], 0));
      return {
        desde,
        hasta: moverDias(desde, DIAS_SEMANA - 1),
        estado: cierre ? ("cerrada" as const) : ("abierta" as const),
        ingresos: total("ingresos"),
        egresos: total("egresos"),
        resultado: total("resultado"),
        galpones: galpones.map((galpon) => ({
          id: galpon.id,
          nombre: galpon.nombre,
          ingresos: aPesos(galpon.ingresos),
          egresos: aPesos(galpon.egresos),
          resultado: aPesos(galpon.resultado),
        })),
      };
    }),
  );
}

export async function listCierres() {
  const cierres = await prisma.cierreSemanal.findMany({
    orderBy: { desde: "desc" },
    include: { usuario: { select: { nombre: true } } },
  });
  return cierres.map((cierre) => ({
    id: cierre.id,
    desde: toIsoDay(cierre.desde),
    hasta: toIsoDay(cierre.hasta),
    totalIngresos: cierre.totalIngresos.toNumber(),
    totalInsumos: cierre.totalInsumos.toNumber(),
    totalGastos: cierre.totalGastos.toNumber(),
    totalRepartido: cierre.totalRepartido.toNumber(),
    cerradoEn: cierre.cerradoEn,
    cerradoPor: cierre.usuario.nombre,
  }));
}

export async function cerrarSemana(desde: string, context: AuditContext) {
  await prisma.$transaction(
    async (transaction) => {
      await bloquearCierres(transaction);
      const existente = await transaction.cierreSemanal.findUnique({ where: { desde: toDateOnly(desde) }, select: { id: true } });
      if (existente) {
        throw new AppError(409, `La semana del ${desde} ya está cerrada`);
      }
      const { hasta, calculo, bloqueos } = await calcularSemana(transaction, desde);
      if (bloqueos.length) {
        throw new AppError(409, `No se puede cerrar la semana: ${bloqueos.join("; ")}`);
      }

      const total = (campo: "ingresos" | "insumos" | "gastos" | "repartible") =>
        aPesos(calculo.galpones.reduce((suma, galpon) => suma + galpon[campo], 0));
      const cierre = await transaction.cierreSemanal.create({
        data: {
          desde: toDateOnly(desde),
          hasta: toDateOnly(hasta),
          totalIngresos: total("ingresos"),
          totalInsumos: total("insumos"),
          totalGastos: total("gastos"),
          totalRepartido: total("repartible"),
          idUsuario: context.userId,
          galpones: {
            create: calculo.galpones.map((galpon) => ({
              idGalpon: galpon.id,
              ingresos: aPesos(galpon.ingresos),
              insumos: aPesos(galpon.insumos),
              gastos: aPesos(galpon.gastos),
              resultado: aPesos(galpon.resultado),
              deudaAnterior: aPesos(galpon.deudaAnterior),
              abonoDeuda: aPesos(galpon.abonoDeuda),
              deudaFinal: aPesos(galpon.deudaFinal),
              repartible: aPesos(galpon.repartible),
              detalle: detalleAJson(galpon),
              socios: {
                create: galpon.socios.map((reparto) => ({
                  idSocio: reparto.idSocio,
                  porcentajeInversion: reparto.puntosBasicos / 100,
                  valor: aPesos(reparto.centavos),
                })),
              },
            })),
          },
        },
      });
      await registrarAuditoria(transaction, context, {
        tabla: "cierre_semanal",
        idRegistro: cierre.id,
        accion: "INSERT",
        despues: { desde, hasta, totalRepartido: total("repartible") },
      });
    },
    { timeout: 15_000 },
  );
  return getSemana(desde);
}

/** Borra el último cierre para poder corregir la semana; queda registrado en la auditoría. */
export async function reabrirSemana(desde: string, context: AuditContext) {
  await prisma.$transaction(async (transaction) => {
    await bloquearCierres(transaction);
    const cierre = await transaction.cierreSemanal.findUnique({ where: { desde: toDateOnly(desde) } });
    if (!cierre) {
      throw new AppError(404, "La semana no tiene cierre");
    }
    const posterior = await transaction.cierreSemanal.findFirst({
      where: { desde: { gt: cierre.desde } },
      select: { id: true },
    });
    if (posterior) {
      throw new AppError(409, "Solo se puede reabrir el último cierre semanal");
    }
    await transaction.cierreSemanal.delete({ where: { id: cierre.id } });
    await registrarAuditoria(transaction, context, {
      tabla: "cierre_semanal",
      idRegistro: cierre.id,
      accion: "DELETE",
      antes: {
        desde,
        totalIngresos: cierre.totalIngresos.toNumber(),
        totalInsumos: cierre.totalInsumos.toNumber(),
        totalGastos: cierre.totalGastos.toNumber(),
        totalRepartido: cierre.totalRepartido.toNumber(),
      },
    });
  });
  return getSemana(desde);
}
