export type AccionAuditoria = "INSERT" | "UPDATE" | "DELETE"

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

export interface RegistroAuditoria {
  id: string
  fechaHora: string
  usuario: { id: number; nombre: string }
  tabla: string
  registro: string
  accion: AccionAuditoria
  resultado: "EXITOSO" | "FALLIDO"
  ip: string | null
  antes: JsonValue | null
  despues: JsonValue | null
}

export interface AuditoriaPage {
  items: RegistroAuditoria[]
  page: number
  limit: number
  total: number
}

export interface AuditoriaOpciones {
  tablas: string[]
  usuarios: { id: number; nombre: string }[]
}

/** Filtros del visor; un valor vacío significa "sin filtrar". */
export interface AuditoriaFiltros {
  tabla: string
  accion: string
  usuarioId: string
  registro: string
  desde: string
  hasta: string
  page: number
  limit: number
}
