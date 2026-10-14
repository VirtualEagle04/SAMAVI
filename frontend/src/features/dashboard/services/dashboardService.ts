import { useAuthStore } from "../../auth/stores/authStore"
import type { ResumenSemanal } from "../types/dashboard.types"

const API_URL = import.meta.env.VITE_API_URL ?? ""

async function request<T>(path: string): Promise<T> {
  const token = useAuthStore.getState().token
  const response = await fetch(`${API_URL}/api/v1${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(typeof body?.error === "string" ? body.error : `No se pudo completar la solicitud (${response.status})`)
  }
  return response.json() as Promise<T>
}

export const getResumenSemanal = (desde?: string) =>
  request<ResumenSemanal>(`/dashboard/resumen-semanal${desde ? `?${new URLSearchParams({ desde })}` : ""}`)
