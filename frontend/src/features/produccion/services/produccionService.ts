import { useAuthStore } from "../../../stores/authStore"
import type {
  CategoriaPeso,
  CierreDiario,
  DailyClosePayload,
  DeviceStatus,
  Galpon,
  LogConteo,
  RegisterCountPayload,
} from "../types/produccion.types"

const API_URL = import.meta.env.VITE_API_URL ?? ""

function getAuthHeaders(): HeadersInit {
  const token = useAuthStore.getState().token
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    const errorMessage =
      errorData && typeof errorData.error === "string"
        ? errorData.error
        : `Error en la solicitud: ${response.status} ${response.statusText}`
    throw new Error(errorMessage)
  }
  return response.json() as Promise<T>
}

export async function getCounts(galponId?: number, limit = 200): Promise<LogConteo[]> {
  const params = new URLSearchParams()
  if (galponId) params.append("galponId", galponId.toString())
  if (limit) params.append("limit", limit.toString())

  const response = await fetch(
    `${API_URL}/api/v1/produccion/conteos${params.toString() ? `?${params.toString()}` : ""}`,
    {
      headers: getAuthHeaders(),
    }
  )
  return handleResponse<LogConteo[]>(response)
}

export async function getGalpones(): Promise<Galpon[]> {
  const response = await fetch(`${API_URL}/api/v1/produccion/galpones`, {
    headers: getAuthHeaders(),
  })
  return handleResponse<Galpon[]>(response)
}

export async function getCategorias(): Promise<CategoriaPeso[]> {
  const response = await fetch(`${API_URL}/api/v1/produccion/categorias`, {
    headers: getAuthHeaders(),
  })
  return handleResponse<CategoriaPeso[]>(response)
}

export async function getCierres(galponId?: number, fecha?: string): Promise<CierreDiario[]> {
  const params = new URLSearchParams()
  if (galponId) params.append("galponId", galponId.toString())
  if (fecha) params.append("fecha", fecha)

  const response = await fetch(
    `${API_URL}/api/v1/produccion/cierres${params.toString() ? `?${params.toString()}` : ""}`,
    {
      headers: getAuthHeaders(),
    }
  )
  return handleResponse<CierreDiario[]>(response)
}

export async function registerCount(payload: RegisterCountPayload): Promise<LogConteo> {
  const response = await fetch(`${API_URL}/api/v1/produccion/conteos`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })
  return handleResponse<LogConteo>(response)
}

export async function closeDailyProduction(payload: DailyClosePayload): Promise<CierreDiario[]> {
  const response = await fetch(`${API_URL}/api/v1/produccion/cierres`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })
  return handleResponse<CierreDiario[]>(response)
}

export async function getDeviceStatus(): Promise<DeviceStatus> {
  const response = await fetch(`${API_URL}/api/v1/produccion/dispositivo-estado`, {
    headers: getAuthHeaders(),
  })
  return handleResponse<DeviceStatus>(response)
}
