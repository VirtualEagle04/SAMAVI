/** Bandejas por código de categoría de peso. */
export type CantidadesPorCategoria = Record<string, number>

export interface ResumenSemanalGalpon {
  id: number
  nombre: string
  /** Columnas del galpón: todas las categorías, en el orden de la planilla. */
  categorias: string[]
  dias: { fecha: string; cantidades: CantidadesPorCategoria }[]
  bodegaInicial: CantidadesPorCategoria
  /** Bandejas de la semana más la bodega inicial. */
  total: CantidadesPorCategoria
}

export interface ResumenSemanalCategoria {
  codigo: string
  nombre: string
  /** Producción de la semana más la bodega inicial. */
  produccion: number
  ventas: number
  /** Lo que queda tras las ventas (producción - ventas). */
  bodega: number
}

export interface ResumenSemanal {
  desde: string
  hasta: string
  fechas: string[]
  fechaCorteBodega: string | null
  galpones: ResumenSemanalGalpon[]
  resumen: ResumenSemanalCategoria[]
}
