export type EstadoSemana = "abierta" | "cerrada"

export type RepartoGalponSocio = {
  id: number
  nombre: string
  porcentaje: number
  valor: number
}

/** Bandejas de una categoría vendidas a un precio (registradas o prorrateadas al galpón). */
export type VentaGalpon = {
  categoria: string
  precio: number
  bandejas: number
  valor: number
}

export type BodegaGalpon = {
  categoria: string
  /** Producción de la semana más bodega inicial. */
  disponible: number
  vendidas: number
  restante: number
}

export type InsumoGalpon = {
  concepto: string
  unidad: string
  cantidad: number
  valor: number
}

/** Parte de un gasto que le toca al galpón. */
export type GastoGalpon = {
  id: number
  concepto: string
  valor: number
  compartido: boolean
}

export type ResultadoGalpon = {
  id: number
  nombre: string
  ventas: VentaGalpon[]
  bodega: BodegaGalpon[]
  insumosDetalle: InsumoGalpon[]
  gastosDetalle: GastoGalpon[]
  ingresos: number
  /** Parte del ingreso prorrateada por ventas sin galpón; null en semanas cerradas. */
  ingresosProrrateados: number | null
  insumos: number
  gastos: number
  resultado: number
  deudaAnterior: number
  abonoDeuda: number
  deudaFinal: number
  repartible: number
  socios: RepartoGalponSocio[]
}

export type RepartoSocio = {
  id: number
  nombre: string
  total: number
  galpones: RepartoGalponSocio[]
}

export type GastoSemana = {
  id: number
  concepto: string
  valor: number
  fecha: string
  galpones: Array<{ id: number; nombre: string; valor: number }>
}

export type SemanaConsolidada = {
  desde: string
  hasta: string
  estado: EstadoSemana
  cerradoEn: string | null
  cerradoPor: string | null
  puedeCerrar: boolean
  totales: {
    ingresos: number
    insumos: number
    gastos: number
    resultado: number
    repartido: number
    deudaFinal: number
    ingresosSinAsignar: number
  }
  galpones: ResultadoGalpon[]
  socios: RepartoSocio[]
  gastos: GastoSemana[]
  advertencias: string[]
  bloqueos: string[]
}

export type HistorialGalpon = {
  id: number
  nombre: string
  ingresos: number
  /** Insumos más gastos. */
  egresos: number
  resultado: number
}

export type SemanaHistorial = {
  desde: string
  hasta: string
  estado: EstadoSemana
  ingresos: number
  egresos: number
  resultado: number
  galpones: HistorialGalpon[]
}

export type GastoPayload = {
  concepto: string
  valor: number
  fecha: string
  galponIds: number[]
}
