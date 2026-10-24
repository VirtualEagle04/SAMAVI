import { useAuthStore } from "../../auth/stores/authStore"
import type {
  CategoriaPeso,
  CierreDiario,
  CierreProduccionDia,
  ConteoEvent,
  BodegaStock,
  DailyClosePayload,
  DeviceStatus,
  Galpon,
  LogConteo,
  RegisterCountPayload,
  ResumenConteoDiario,
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

export async function getDailyCountSummary(): Promise<ResumenConteoDiario[]> {
  const response = await fetch(`${API_URL}/api/v1/produccion/conteos/resumen-diario`, {
    headers: getAuthHeaders(),
  });
  return handleResponse<ResumenConteoDiario[]>(response);
}

export async function getCierresProduccion(galponId?: number, fecha?: string): Promise<CierreProduccionDia[]> {
  const params = new URLSearchParams()
  if (galponId) params.append("galponId", galponId.toString())
  if (fecha) params.append("fecha", fecha)
  const response = await fetch(`${API_URL}/api/v1/produccion/cierres-realizados${params.toString() ? `?${params}` : ""}`, { headers: getAuthHeaders() })
  return handleResponse<CierreProduccionDia[]>(response)
}

export async function getBodega(galponId?: number, fechaCorte?: string): Promise<BodegaStock[]> {
  const params = new URLSearchParams()
  if (galponId) params.append("galponId", galponId.toString())
  if (fechaCorte) params.append("fechaCorte", fechaCorte)
  const response = await fetch(`${API_URL}/api/v1/produccion/bodega${params.toString() ? `?${params}` : ""}`, { headers: getAuthHeaders() })
  return handleResponse<BodegaStock[]>(response)
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

const EVENTS_RETRY_MS = 3000

export interface ProductionEventHandlers {
  onConteo: (event: ConteoEvent) => void
  onDispositivo: (status: DeviceStatus) => void
}

/**
 * Abre el stream SSE de producción: llama a `onConteo` cada vez que el backend
 * registra un conteo y a `onDispositivo` al conectar y cada vez que cambia el estado
 * del ESP32. Se reconecta solo si la conexión se cae. Devuelve la función que cierra
 * la suscripción.
 */
export function subscribeProductionEvents({ onConteo, onDispositivo }: ProductionEventHandlers): () => void {
  const controller = new AbortController()
  let retryTimer: ReturnType<typeof setTimeout> | undefined

  const dispatch = (rawEvent: string) => {
    let eventName = "message"
    const dataLines: string[] = []
    for (const line of rawEvent.split("\n")) {
      if (line.startsWith("event:")) eventName = line.slice(6).trim()
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart())
    }
    if (dataLines.length === 0) return
    try {
      const data: unknown = JSON.parse(dataLines.join("\n"))
      if (eventName === "conteo") onConteo(data as ConteoEvent)
      else if (eventName === "dispositivo") onDispositivo(data as DeviceStatus)
    } catch (err) {
      console.error("Evento de producción inválido:", err)
    }
  }

  const connect = async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/produccion/eventos`, {
        headers: { ...getAuthHeaders(), Accept: "text/event-stream" },
        signal: controller.signal,
      })
      // Sin sesión válida no tiene sentido reintentar; el polling de la página sigue funcionando.
      if (response.status === 401 || response.status === 403) {
        console.error("Stream de producción rechazado:", response.status)
        return
      }
      if (!response.ok || !response.body) {
        throw new Error(`Error en la solicitud: ${response.status} ${response.statusText}`)
      }

      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
      let buffer = ""
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += value.replace(/\r\n?/g, "\n")
        let boundary = buffer.indexOf("\n\n")
        while (boundary !== -1) {
          dispatch(buffer.slice(0, boundary))
          buffer = buffer.slice(boundary + 2)
          boundary = buffer.indexOf("\n\n")
        }
      }
    } catch (err) {
      if (controller.signal.aborted) return
      console.error("Stream de producción desconectado:", err)
    }
    if (!controller.signal.aborted) {
      retryTimer = setTimeout(() => void connect(), EVENTS_RETRY_MS)
    }
  }

  void connect()

  return () => {
    controller.abort()
    clearTimeout(retryTimer)
  }
}
