import { Prisma } from "@prisma/client";
import { AppError } from "../../shared/errors/app-error.js";

export type InsumoInput = {
  codigo: string;
  nombre: string;
  descripcion?: string | undefined;
  unidadMedida: string;
  stockMinimo: number;
  costo?: number | undefined;
};

export type ProveedorInput = {
  nombre: string;
  contacto?: Prisma.InputJsonObject | undefined;
};

export type CompraDetalleInput = {
  insumoId: number;
  cantidad: number;
  costoUnitario: number;
  lote?: string | undefined;
  fechaVencimiento?: string | undefined;
};

export type CompraInput = {
  fecha: Date;
  proveedorId: number;
  numeroFactura?: string | undefined;
  observaciones?: string | undefined;
  total: number;
  detalles: CompraDetalleInput[];
};

export type MovimientoInput = {
  codigoTipoMovimiento: string;
  insumoId: number;
  galponId?: number | undefined;
  cantidad: number;
  costoUnitario?: number | undefined;
  idCierreDiario?: number | undefined;
  observaciones?: string | undefined;
};

export type InventarioFilters = {
  insumoId?: number | undefined;
  galponId?: number | undefined;
  fechaDesde?: Date | undefined;
  fechaHasta?: Date | undefined;
  tipoMovimiento?: string | undefined;
  page: number;
  limit: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredText(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new AppError(400, `${field} es obligatorio`);
  }
  return value.trim();
}

function optionalText(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  return requiredText(value, field);
}

function positiveNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new AppError(400, `${field} debe ser un número positivo`);
  }
  return value;
}

function nonNegativeNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new AppError(400, `${field} debe ser un número mayor o igual a cero`);
  }
  return value;
}

function positiveInteger(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new AppError(400, `${field} debe ser un entero positivo`);
  }
  return value;
}

function optionalPositiveInteger(value: unknown, field: string): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "number") return positiveInteger(value, field);
  if (typeof value !== "string") throw new AppError(400, `${field} es inválido`);
  const parsed = Number(value);
  return positiveInteger(parsed, field);
}

function parseDate(value: unknown, field: string): Date {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new AppError(400, `${field} debe ser una fecha válida`);
  }
  return new Date(value);
}

function parseOptionalDate(value: unknown, field: string): Date | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return parseDate(value, field);
}

function parseContact(value: unknown): Prisma.InputJsonObject | undefined {
  if (value === undefined || value === null) return undefined;
  if (!isRecord(value)) throw new AppError(400, "contacto debe ser un objeto JSON");
  return value as Prisma.InputJsonObject;
}

function parseDetalles(value: unknown): CompraDetalleInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new AppError(400, "detalles debe contener al menos una línea");
  }
  const seen = new Set<number>();
  return value.map((item, index) => {
    if (!isRecord(item)) throw new AppError(400, `detalles[${index}] es inválido`);
    const insumoId = positiveInteger(item.insumoId, `detalles[${index}].insumoId`);
    if (seen.has(insumoId)) throw new AppError(400, `El insumo ${insumoId} está repetido`);
    seen.add(insumoId);
    return {
      insumoId,
      cantidad: positiveNumber(item.cantidad, `detalles[${index}].cantidad`),
      costoUnitario: nonNegativeNumber(item.costoUnitario, `detalles[${index}].costoUnitario`),
      ...(optionalText(item.lote, `detalles[${index}].lote`) === undefined
        ? {}
        : { lote: optionalText(item.lote, `detalles[${index}].lote`) }),
      ...(parseOptionalDate(item.fechaVencimiento, `detalles[${index}].fechaVencimiento`) === undefined
        ? {}
        : { fechaVencimiento: item.fechaVencimiento as string }),
    };
  });
}

export function parseInsumoInput(body: unknown): InsumoInput {
  if (!isRecord(body)) throw new AppError(400, "El cuerpo del insumo es inválido");
  return {
    codigo: requiredText(body.codigo, "codigo"),
    nombre: requiredText(body.nombre, "nombre"),
    ...(optionalText(body.descripcion, "descripcion") === undefined ? {} : { descripcion: optionalText(body.descripcion, "descripcion") }),
    unidadMedida: requiredText(body.unidadMedida, "unidadMedida"),
    stockMinimo: nonNegativeNumber(body.stockMinimo, "stockMinimo"),
    ...(body.costo === undefined ? {} : { costo: nonNegativeNumber(body.costo, "costo") }),
  };
}

export function parseProveedorInput(body: unknown): ProveedorInput {
  if (!isRecord(body)) throw new AppError(400, "El cuerpo del proveedor es inválido");
  const contacto = parseContact(body.contacto);
  return {
    nombre: requiredText(body.nombre, "nombre"),
    ...(contacto === undefined ? {} : { contacto }),
  };
}

export function parseCompraInput(body: unknown): CompraInput {
  if (!isRecord(body)) throw new AppError(400, "El cuerpo de la compra es inválido");
  return {
    fecha: parseDate(body.fecha, "fecha"),
    proveedorId: positiveInteger(body.proveedorId, "proveedorId"),
    ...(optionalText(body.numeroFactura, "numeroFactura") === undefined ? {} : { numeroFactura: optionalText(body.numeroFactura, "numeroFactura") }),
    ...(optionalText(body.observaciones, "observaciones") === undefined ? {} : { observaciones: optionalText(body.observaciones, "observaciones") }),
    total: nonNegativeNumber(body.total, "total"),
    detalles: parseDetalles(body.detalles),
  };
}

export function parseMovimientoInput(body: unknown): MovimientoInput {
  if (!isRecord(body)) throw new AppError(400, "El cuerpo del movimiento es inválido");
  return {
    codigoTipoMovimiento: requiredText(body.codigoTipoMovimiento, "codigoTipoMovimiento"),
    insumoId: positiveInteger(body.insumoId, "insumoId"),
    ...(optionalPositiveInteger(body.galponId, "galponId") === undefined ? {} : { galponId: optionalPositiveInteger(body.galponId, "galponId") }),
    cantidad: positiveNumber(body.cantidad, "cantidad"),
    ...(body.costoUnitario === undefined ? {} : { costoUnitario: nonNegativeNumber(body.costoUnitario, "costoUnitario") }),
    ...(optionalPositiveInteger(body.idCierreDiario, "idCierreDiario") === undefined ? {} : { idCierreDiario: optionalPositiveInteger(body.idCierreDiario, "idCierreDiario") }),
    ...(optionalText(body.observaciones, "observaciones") === undefined ? {} : { observaciones: optionalText(body.observaciones, "observaciones") }),
  };
}

export function parseId(value: unknown, field: string): number {
  if (typeof value !== "string" || value.trim() === "") throw new AppError(400, `${field} es obligatorio`);
  return positiveInteger(Number(value), field);
}

export function parseInventarioFilters(query: Record<string, unknown>): InventarioFilters {
  const page = optionalPositiveInteger(query.page, "page") ?? 1;
  const limit = optionalPositiveInteger(query.limit, "limit") ?? 20;
  if (limit > 100) throw new AppError(400, "limit no puede ser mayor a 100");
  const fechaDesde = parseOptionalDate(query.fechaDesde, "fechaDesde");
  const fechaHasta = parseOptionalDate(query.fechaHasta, "fechaHasta");
  if (fechaDesde && fechaHasta && fechaDesde > fechaHasta) {
    throw new AppError(400, "fechaDesde no puede ser posterior a fechaHasta");
  }
  return {
    ...(optionalPositiveInteger(query.insumoId, "insumoId") === undefined ? {} : { insumoId: optionalPositiveInteger(query.insumoId, "insumoId") }),
    ...(optionalPositiveInteger(query.galponId, "galponId") === undefined ? {} : { galponId: optionalPositiveInteger(query.galponId, "galponId") }),
    ...(typeof query.tipoMovimiento === "string" && query.tipoMovimiento.trim() !== "" ? { tipoMovimiento: query.tipoMovimiento.trim() } : {}),
    ...(fechaDesde === undefined ? {} : { fechaDesde }),
    ...(fechaHasta === undefined ? {} : { fechaHasta }),
    page,
    limit,
  };
}
