import { AppError } from "../../shared/errors/app-error.js";
import type { AccionAuditoria } from "../../shared/audit/auditoria.js";

export type AuditoriaFilters = {
  tabla?: string;
  accion?: AccionAuditoria;
  usuarioId?: number;
  registro?: string;
  desde?: string;
  hasta?: string;
  page: number;
  limit: number;
};

const ACCIONES: readonly AccionAuditoria[] = ["INSERT", "UPDATE", "DELETE"];
const LIMIT_POR_DEFECTO = 25;
const LIMIT_MAXIMO = 100;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Texto opcional: ausente o vacío significa "sin filtrar". */
function optionalText(value: unknown, field: string, max: number): string | undefined {
  if (value === undefined || value === "") {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new AppError(400, `${field} inválido`);
  }
  const text = value.trim();
  if (text.length > max) {
    throw new AppError(400, `${field} no puede superar ${max} caracteres`);
  }
  return text === "" ? undefined : text;
}

function optionalPositiveInteger(value: unknown, field: string): number | undefined {
  if (value === undefined || value === "") {
    return undefined;
  }
  if (typeof value !== "string" || !/^\d+$/.test(value) || Number(value) < 1) {
    throw new AppError(400, `${field} debe ser un entero positivo`);
  }
  return Number(value);
}

function optionalDate(value: unknown, field: string): string | undefined {
  if (value === undefined || value === "") {
    return undefined;
  }
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AppError(400, `${field} debe tener el formato YYYY-MM-DD`);
  }
  const fecha = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== value) {
    throw new AppError(400, `${field} es una fecha inválida`);
  }
  return value;
}

function optionalAccion(value: unknown): AccionAuditoria | undefined {
  if (value === undefined || value === "") {
    return undefined;
  }
  const accion = ACCIONES.find((candidate) => candidate === value);
  if (!accion) {
    throw new AppError(400, "accion debe ser INSERT, UPDATE o DELETE");
  }
  return accion;
}

export function parseAuditoriaQuery(query: unknown): AuditoriaFilters {
  const source = isRecord(query) ? query : {};
  const tabla = optionalText(source.tabla, "tabla", 50);
  const accion = optionalAccion(source.accion);
  const usuarioId = optionalPositiveInteger(source.usuarioId, "usuarioId");
  const registro = optionalText(source.registro, "registro", 50);
  const desde = optionalDate(source.desde, "desde");
  const hasta = optionalDate(source.hasta, "hasta");
  if (desde !== undefined && hasta !== undefined && desde > hasta) {
    throw new AppError(400, "desde no puede ser posterior a hasta");
  }
  const page = optionalPositiveInteger(source.page, "page") ?? 1;
  const limit = optionalPositiveInteger(source.limit, "limit") ?? LIMIT_POR_DEFECTO;
  if (limit > LIMIT_MAXIMO) {
    throw new AppError(400, `limit no puede ser mayor a ${LIMIT_MAXIMO}`);
  }

  return {
    ...(tabla === undefined ? {} : { tabla }),
    ...(accion === undefined ? {} : { accion }),
    ...(usuarioId === undefined ? {} : { usuarioId }),
    ...(registro === undefined ? {} : { registro }),
    ...(desde === undefined ? {} : { desde }),
    ...(hasta === undefined ? {} : { hasta }),
    page,
    limit,
  };
}
