export const WEEK_DAYS = 7

const dayFormatter = new Intl.DateTimeFormat("es-CO", {
  weekday: "short",
  day: "2-digit",
  timeZone: "UTC",
})
const dayMonthFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
})
const fullDateFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
})

const parseDay = (isoDay: string) => new Date(`${isoDay}T00:00:00.000Z`)

export function shiftDate(isoDay: string, days: number): string {
  const date = parseDay(isoDay)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/** "vie, 07" para la columna de días de la planilla. */
export const formatWeekDay = (isoDay: string) => dayFormatter.format(parseDay(isoDay))

export const formatFullDate = (isoDay: string) => fullDateFormatter.format(parseDay(isoDay))

/** "Semana del 7 al 13 de agosto de 2026". */
export function formatWeekRange(desde: string, hasta: string): string {
  const start = parseDay(desde)
  const end = parseDay(hasta)
  const startLabel =
    start.getUTCMonth() === end.getUTCMonth()
      ? String(start.getUTCDate())
      : dayMonthFormatter.format(start)
  const yearSuffix =
    start.getUTCFullYear() === end.getUTCFullYear() ? "" : ` de ${start.getUTCFullYear()}`
  return `Semana del ${startLabel}${yearSuffix} al ${dayMonthFormatter.format(end)} de ${end.getUTCFullYear()}`
}

/** Como en el cuaderno, un cero se escribe con guion. */
export function formatCantidad(value: number | undefined): string {
  return value ? value.toLocaleString("es-CO") : "–"
}
