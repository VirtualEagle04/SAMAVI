import { useAuthStore } from "../../auth/stores/authStore"
import type { AuditoriaFiltros, AuditoriaOpciones, AuditoriaPage } from "../types/auditoria.types"

const API_URL = import.meta.env.VITE_API_URL ?? ""

async function request<T>(path: string): Promise<T> {
  const token = useAuthStore.getState().token
  const response = await fetch(`${API_URL}/api/v1${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(typeof body?.error === "string" ? body.error : `No se pudo completar la solicitud (${response.status})`)
  }
  return response.json() as Promise<T>
}

export function getAuditoria(filtros: AuditoriaFiltros) {
  const params = new URLSearchParams({ page: String(filtros.page), limit: String(filtros.limit) })
  for (const key of ["tabla", "accion", "usuarioId", "registro", "desde", "hasta"] as const) {
    if (filtros[key] !== "") params.set(key, filtros[key])
  }
  return request<AuditoriaPage>(`/auditoria?${params.toString()}`)
}

export const getAuditoriaOpciones = () => request<AuditoriaOpciones>("/auditoria/opciones")
