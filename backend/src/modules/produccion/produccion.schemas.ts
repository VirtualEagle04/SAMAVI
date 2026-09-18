import { AppError } from "../../shared/errors/app-error.js";

export type ProductionCountInput = {
  galponId: number;
  categoriaPeso: string;
  cantidad: 1 | -1;
  timestamp: Date;
};

export type DailyCloseInput = {
  fecha: string;
  galponId?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseProductionCountInput(body: unknown): ProductionCountInput {
  if (!isRecord(body)) {
    throw new AppError(400, "El cuerpo del conteo es inválido");
  }

  const galponId = body.galponId;
  const categoriaPeso = body.categoriaPeso;
  const cantidad = body.cantidad;
  const timestampValue = body.timestamp;

  if (typeof galponId !== "number" || !Number.isInteger(galponId) || galponId <= 0) {
    throw new AppError(400, "galponId debe ser un entero positivo");
  }
  if (typeof categoriaPeso !== "string" || categoriaPeso.trim() === "") {
    throw new AppError(400, "categoriaPeso es obligatoria");
  }
  if (cantidad !== 1 && cantidad !== -1) {
    throw new AppError(400, "cantidad debe ser 1 o -1");
  }

  const timestamp = timestampValue === undefined ? new Date() : new Date(String(timestampValue));
  if (Number.isNaN(timestamp.getTime())) {
    throw new AppError(400, "timestamp inválido");
  }

  return {
    galponId,
    categoriaPeso: categoriaPeso.trim(),
    cantidad,
    timestamp,
  };
}

export function parseDailyCloseInput(body: unknown): DailyCloseInput {
  if (!isRecord(body) || typeof body.fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.fecha)) {
    throw new AppError(400, "fecha debe tener el formato YYYY-MM-DD");
  }

  const fecha = new Date(`${body.fecha}T00:00:00.000Z`);
  if (Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== body.fecha) {
    throw new AppError(400, "fecha inválida");
  }

  if (body.galponId !== undefined &&
      (typeof body.galponId !== "number" || !Number.isInteger(body.galponId) || body.galponId <= 0)) {
    throw new AppError(400, "galponId debe ser un entero positivo");
  }

  return body.galponId === undefined
    ? { fecha: body.fecha }
    : { fecha: body.fecha, galponId: body.galponId };
}