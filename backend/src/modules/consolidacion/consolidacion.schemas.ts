import { AppError } from "../../shared/errors/app-error.js";

export type GastoInput = {
  concepto: string;
  valor: number;
  fecha: string;
  galponIds: number[];
};

const VIERNES = 5;
const VALOR_MAXIMO_GASTO = 99_999_999.99;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function positiveInteger(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new AppError(400, `${field} debe ser un entero positivo`);
  }
  return value;
}

export function parseFecha(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AppError(400, `${field} debe tener el formato YYYY-MM-DD`);
  }
  const fecha = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== value) {
    throw new AppError(400, `${field} es una fecha inválida`);
  }
  return value;
}

/** La semana productiva va de viernes a jueves; se identifica por su viernes. */
export function parseDesde(value: unknown): string {
  const desde = parseFecha(value, "desde");
  if (new Date(`${desde}T00:00:00.000Z`).getUTCDay() !== VIERNES) {
    throw new AppError(400, "desde debe ser un viernes");
  }
  return desde;
}

export const SEMANAS_HISTORIAL_POR_DEFECTO = 8;
const SEMANAS_HISTORIAL_MAXIMO = 26;

/** `hasta` (cualquier día de la última semana) y cuántas semanas incluir. */
export function parseHistorialQuery(query: Record<string, unknown>): { hasta: string; semanas: number } {
  const hasta = parseFecha(query.hasta, "hasta");
  if (query.semanas === undefined) {
    return { hasta, semanas: SEMANAS_HISTORIAL_POR_DEFECTO };
  }
  const semanas = typeof query.semanas === "string" ? Number(query.semanas) : Number.NaN;
  if (!Number.isInteger(semanas) || semanas < 1 || semanas > SEMANAS_HISTORIAL_MAXIMO) {
    throw new AppError(400, `semanas debe ser un entero entre 1 y ${SEMANAS_HISTORIAL_MAXIMO}`);
  }
  return { hasta, semanas };
}

export function parseId(value: unknown, field: string): number {
  if (typeof value !== "string" || value.trim() === "") {
    throw new AppError(400, `${field} es obligatorio`);
  }
  return positiveInteger(Number(value), field);
}

export function parseGastoInput(body: unknown): GastoInput {
  if (!isRecord(body)) {
    throw new AppError(400, "El cuerpo del gasto es inválido");
  }
  if (typeof body.concepto !== "string" || body.concepto.trim() === "") {
    throw new AppError(400, "concepto es obligatorio");
  }
  const concepto = body.concepto.trim();
  if (concepto.length > 150) {
    throw new AppError(400, "concepto no puede superar 150 caracteres");
  }
  if (typeof body.valor !== "number" || !Number.isFinite(body.valor) || body.valor <= 0) {
    throw new AppError(400, "valor debe ser un número positivo");
  }
  if (body.valor > VALOR_MAXIMO_GASTO || Math.abs(Math.round(body.valor * 100) - body.valor * 100) > 1e-6) {
    throw new AppError(400, "valor debe tener máximo dos decimales y no superar 99.999.999,99");
  }
  if (!Array.isArray(body.galponIds) || body.galponIds.length === 0) {
    throw new AppError(400, "galponIds debe incluir al menos un galpón");
  }
  const galponIds = body.galponIds.map((id, index) => positiveInteger(id, `galponIds[${index}]`));
  if (new Set(galponIds).size !== galponIds.length) {
    throw new AppError(400, "galponIds no puede repetir galpones");
  }

  return {
    concepto,
    valor: body.valor,
    fecha: parseFecha(body.fecha, "fecha"),
    galponIds,
  };
}
