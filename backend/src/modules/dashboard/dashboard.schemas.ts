import { AppError } from "../../shared/errors/app-error.js";

export type WeeklySummaryQuery = {
  desde?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseWeeklySummaryQuery(query: unknown): WeeklySummaryQuery {
  const desde = isRecord(query) ? query.desde : undefined;
  if (desde === undefined || desde === "") {
    return {};
  }
  if (typeof desde !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(desde)) {
    throw new AppError(400, "desde debe tener el formato YYYY-MM-DD");
  }
  const fecha = new Date(`${desde}T00:00:00.000Z`);
  if (Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== desde) {
    throw new AppError(400, "desde es una fecha inválida");
  }
  return { desde };
}
