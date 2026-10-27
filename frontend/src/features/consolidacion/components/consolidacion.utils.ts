const VIERNES = 5
const DIAS_SEMANA = 7

const moneyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

export const formatMoney = (value: number) => moneyFormatter.format(value)

const compactFormatter = new Intl.NumberFormat("es-CO", {
  notation: "compact",
  maximumFractionDigits: 1,
})

/** Monto corto para ejes y etiquetas de gráficas: "$4,8 M", "$950 mil". */
export const formatCompactMoney = (value: number) =>
  `${value < 0 ? "−" : ""}$${compactFormatter.format(Math.abs(value))}`

const cantidadFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 })

export const formatCantidad = (value: number) => cantidadFormatter.format(value)

export const signedColor = (value: number) => (value < 0 ? "error.main" : "text.primary")

/** Viernes con el que empieza la semana productiva (viernes a jueves) de una fecha. */
export function fridayOf(isoDay: string): string {
  const date = new Date(`${isoDay}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() - VIERNES + DIAS_SEMANA) % DIAS_SEMANA))
  return date.toISOString().slice(0, 10)
}

/** Semana en curso según el calendario de Bogotá. */
export function currentFriday(now: Date = new Date()): string {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(now)
  return fridayOf(today)
}
