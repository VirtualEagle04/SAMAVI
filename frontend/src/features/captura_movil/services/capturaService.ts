import { useAuthStore } from "../../../stores/authStore"
import type { AjusteAvesPayload, CapturaGalpon, CausaBaja, StockItem } from "../types/captura.types"

const API_URL = import.meta.env.VITE_API_URL ?? ""
const BASE_PATH = `${API_URL}/api/v1/captura-movil`

function getAuthHeaders(): HeadersInit {
  const token = useAuthStore.getState().token
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const message = body && typeof body.error === "string"
      ? body.error
      : `Error en la solicitud: ${response.status} ${response.statusText}`
    throw new Error(message)
  }

  return response.json() as Promise<T>
}

export async function getCapturaGalpones(): Promise<CapturaGalpon[]> {
  const response = await fetch(`${BASE_PATH}/galpones`, { headers: getAuthHeaders() })
  return handleResponse<CapturaGalpon[]>(response)
}

export async function getStock(): Promise<StockItem[]> {
  const response = await fetch(`${BASE_PATH}/stock`, { headers: getAuthHeaders() })
  return handleResponse<StockItem[]>(response)
}

export async function getCausasBaja(): Promise<CausaBaja[]> {
  const response = await fetch(`${BASE_PATH}/causas-baja`, { headers: getAuthHeaders() })
  return handleResponse<CausaBaja[]>(response)
}

export async function adjustBirds(payload: AjusteAvesPayload): Promise<CapturaGalpon> {
  const response = await fetch(`${BASE_PATH}/galpones/${payload.galponId}/aves`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })
  return handleResponse<CapturaGalpon>(response)
}

export async function registerFeeding(galponId: number): Promise<void> {
  const response = await fetch(`${BASE_PATH}/galpones/${galponId}/alimentacion`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ fecha: new Date().toISOString().slice(0, 10) }),
  })
  await handleResponse<{ ok: true }>(response)
}
