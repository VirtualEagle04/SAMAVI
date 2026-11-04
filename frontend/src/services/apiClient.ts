import { useAuthStore } from "../features/auth/stores/authStore"

const API_URL = import.meta.env.VITE_API_URL ?? ""

/**
 * `fetch` autenticado contra `/api/v1`: agrega el JWT de la sesión y detecta de
 * forma centralizada un 401 (token expirado o sesión revocada) para avisar al
 * usuario y llevarlo al login. Devuelve la respuesta sin consumir el cuerpo.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = useAuthStore.getState().token
  const headers = new Headers(init.headers)
  if (token) headers.set("Authorization", `Bearer ${token}`)

  const response = await fetch(`${API_URL}/api/v1${path}`, { ...init, headers })

  // Solo cuenta si el token rechazado sigue siendo el de la sesión actual.
  if (response.status === 401 && token && useAuthStore.getState().token === token) {
    const body = (await response.clone().json().catch(() => null)) as { error?: unknown } | null
    useAuthStore.getState().expireSession(typeof body?.error === "string" ? body.error : undefined)
  }
  return response
}
