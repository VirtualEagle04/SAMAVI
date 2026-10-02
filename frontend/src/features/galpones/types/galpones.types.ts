export type EstadoGalpon = "activo" | "inactivo" | "mantenimiento"

export interface GalponResumen {
  id: number
  nombre: string
  gallinasActuales: number
  estado: EstadoGalpon
  alimentadoHoy: boolean
  alimentadoEn: string | null
}

export type TipoCambioGallinas = "ingreso" | "baja"

export interface CambioGallinasPayload {
  tipo: TipoCambioGallinas
  cantidad: number
  causa?: string
}

export interface RegistroAlimentacionDia {
  fecha: string
  registradoEn: string
  usuario: string
}

export interface CambioGallinas {
  id: number
  fechaHora: string
  usuario: string
  datosAnteriores: { gallinasActuales: number } | null
  datosNuevos: { gallinasActuales: number; tipo: TipoCambioGallinas; cantidad: number; causa?: string } | null
}

export interface GalponDetalle extends GalponResumen {
  fechaHoy: string
  alimentaciones: RegistroAlimentacionDia[]
  cambiosGallinas: CambioGallinas[]
}
