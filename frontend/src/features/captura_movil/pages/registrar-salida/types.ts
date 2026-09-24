export interface SalidaClient {
  id: number | string
  nombre: string
  empresa?: string
  telefono?: string
}

export interface SalidaCategory {
  codigo: string
  nombre: string
  cantidadBandejasDisponibles: number
}

export interface SalidaCartItem {
  categoria: SalidaCategory
  cantidadBandejas: number
}

export interface ManualClientDraft {
  nombre: string
  empresa: string
  telefono: string
}

export interface SalidaOrderDraft {
  cliente: SalidaClient
  items: SalidaCartItem[]
}
