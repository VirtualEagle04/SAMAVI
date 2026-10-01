import { AppError } from "../../shared/errors/app-error.js";

export type CambioGallinasInput = {
  tipo: "ingreso" | "baja";
  cantidad: number;
  causa?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function positiveInteger(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new AppError(400, `${field} debe ser un entero positivo`);
  }
  return value;
}

export function parseId(value: unknown, field: string): number {
  if (typeof value !== "string" || value.trim() === "") {
    throw new AppError(400, `${field} es obligatorio`);
  }
  return positiveInteger(Number(value), field);
}

export function parseCambioGallinasInput(body: unknown): CambioGallinasInput {
  if (!isRecord(body)) {
    throw new AppError(400, "El cuerpo del cambio de gallinas es inválido");
  }
  if (body.tipo !== "ingreso" && body.tipo !== "baja") {
    throw new AppError(400, "tipo debe ser ingreso o baja");
  }
  const cantidad = positiveInteger(body.cantidad, "cantidad");

  let causa: string | undefined;
  if (body.causa !== undefined && body.causa !== null) {
    if (typeof body.causa !== "string") {
      throw new AppError(400, "causa debe ser texto");
    }
    causa = body.causa.trim() === "" ? undefined : body.causa.trim();
  }
  if (causa !== undefined && causa.length > 200) {
    throw new AppError(400, "causa no puede superar 200 caracteres");
  }
  if (body.tipo === "baja" && causa === undefined) {
    throw new AppError(400, "causa es obligatoria cuando se reducen gallinas");
  }

  return {
    tipo: body.tipo,
    cantidad,
    ...(causa === undefined ? {} : { causa }),
  };
}
