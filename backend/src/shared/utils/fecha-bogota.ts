const BOGOTA_TIME_ZONE = "America/Bogota";

const bogotaDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BOGOTA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Fecha de hoy en Bogotá con formato YYYY-MM-DD. */
export function todayBogota(now: Date = new Date()): string {
  return bogotaDateFormatter.format(now);
}

/** Convierte YYYY-MM-DD en una fecha UTC a medianoche, apta para columnas DATE de Prisma. */
export function toDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}
