import { useAuthStore } from "../../../stores/authStore"
import type { CambioGallinasPayload, GalponDetalle, GalponResumen } from "../types/galpones.types"

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

export const getGalpones = () => request<GalponResumen[]>("/galpones")
export const getGalpon = (id: number) => request<GalponDetalle>(`/galpones/${id}`)
export const registrarAlimentacion = (id: number) =>
  request<{ idGalpon: number; fecha: string; registradoEn: string }>(`/galpones/${id}/alimentacion`, { method: "POST" })
export const cambiarGallinas = (id: number, data: CambioGallinasPayload) =>
  request<GalponResumen>(`/galpones/${id}/gallinas`, { method: "PATCH", body: JSON.stringify(data) })
