export interface Galpon {
  id: number
  nombre: string
  gallinasActuales: number
  estado: "activo" | "inactivo" | "mantenimiento" | string
}

export interface CategoriaPeso {
  codigo: string
  nombre: string
  pesoMinG: number | null
  pesoMaxG: number | null
}

export interface LogConteo {
  id: string
  timestamp: string
  cantidad: number
  idGalpon: number
  codigoCategoriaPeso: string
  galpon?: Galpon
  categoriaPeso?: CategoriaPeso
}

export interface CierreDiario {
  idGalpon: number
  codigoCategoriaPeso: string
  fecha: string
  cantidadBandejas: number
  cantidadSobrante: number
  galpon?: Galpon
  categoriaPeso?: CategoriaPeso
}

export interface RegisterCountPayload {
  galponId: number
  categoriaPeso: string
  cantidad: 1 | -1
  timestamp?: string
}

export interface DailyClosePayload {
  fecha: string
  galponId?: number
}

export interface CategoryCountSummary {
  codigo: string
  nombre: string
  unidades: number
  bandejas: number
  sobrante: number
  porcentaje: number
}

export interface DeviceStatus {
  connected: boolean
  brokerConnected: boolean
  connectedClients: number
  lastActivity: string | null
  status: "online" | "offline"
}
