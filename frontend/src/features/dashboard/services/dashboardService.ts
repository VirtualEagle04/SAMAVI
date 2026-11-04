import { apiFetch } from "../../../services/apiClient"
import type { ResumenSemanal } from "../types/dashboard.types"

async function request<T>(path: string): Promise<T> {
  const response = await apiFetch(path, { headers: { "Content-Type": "application/json" } })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(typeof body?.error === "string" ? body.error : `No se pudo completar la solicitud (${response.status})`)
  }
  return response.json() as Promise<T>
}

export const getResumenSemanal = (desde?: string) =>
  request<ResumenSemanal>(`/dashboard/resumen-semanal${desde ? `?${new URLSearchParams({ desde })}` : ""}`)
