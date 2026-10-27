import { useAuthStore } from "../../auth/stores/authStore"
import type { GastoPayload, GastoSemana, SemanaConsolidada, SemanaHistorial } from "../types/consolidacion.types"

const API_URL = import.meta.env.VITE_API_URL ?? ""

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token
  const response = await fetch(`${API_URL}/api/v1${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (response.status === 204) return undefined as T
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(typeof body?.error === "string" ? body.error : `No se pudo completar la solicitud (${response.status})`)
  }
  return response.json() as Promise<T>
}

export const getSemana = (desde: string) => request<SemanaConsolidada>(`/consolidacion/semanas/${desde}`)
export const getHistorial = (hasta: string, semanas = 8) =>
  request<SemanaHistorial[]>(`/consolidacion/historial?hasta=${hasta}&semanas=${semanas}`)
export const cerrarSemana = (desde: string) =>
  request<SemanaConsolidada>(`/consolidacion/semanas/${desde}/cierre`, { method: "POST" })
export const reabrirSemana = (desde: string) =>
  request<SemanaConsolidada>(`/consolidacion/semanas/${desde}/cierre`, { method: "DELETE" })
export const createGasto = (data: GastoPayload) =>
  request<GastoSemana>("/consolidacion/gastos", { method: "POST", body: JSON.stringify(data) })
export const deleteGasto = (id: number) => request<void>(`/consolidacion/gastos/${id}`, { method: "DELETE" })
