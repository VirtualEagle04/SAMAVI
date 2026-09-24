export interface CapturaGalpon {
  id: number
  nombre: string
  raza?: string | null
  aves: number
  estado: "activo" | "inactivo" | "mantenimiento" | string
  alimentacionHoy: boolean
  alimentacionHora?: string | null
}

export interface CausaBaja {
  codigo: string
  nombre: string
}

export interface AjusteAvesPayload {
  galponId: number
  cantidad: number
  causa?: string
}

export interface StockItem {
  codigo: string
  nombre: string
  cantidadBandejas: number
}
