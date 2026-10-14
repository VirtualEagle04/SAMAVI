const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
})

const timeFormatter = new Intl.DateTimeFormat("es-CO", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h12",
  timeZone: "UTC",
})

export const formatProductionDate = (value: string) =>
  dateFormatter.format(new Date(value))

export const formatProductionTime = (value: string) =>
  timeFormatter.format(new Date(value))

export const formatProductionDateTime = (value: string) =>
  `${formatProductionDate(value)}, ${formatProductionTime(value)}`
