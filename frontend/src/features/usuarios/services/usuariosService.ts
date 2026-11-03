import { useAuthStore } from "../../auth/stores/authStore"
import type {
  CrearUsuarioPayload,
  EditarUsuarioPayload,
  Permiso,
  Rol,
  RolPayload,
  Usuario,
} from "../types/usuarios.types"

const API_URL = import.meta.env.VITE_API_URL ?? ""

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token
  let response: Response
  try {
    response = await fetch(`${API_URL}/api/v1/usuarios${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new Error("No se pudo conectar con el servidor")
  }
  if (response.status === 204) return undefined as T

  const body = (await response.json().catch(() => null)) as { error?: unknown } | null
  const message = typeof body?.error === "string" ? body.error : `No se pudo completar la solicitud (${response.status})`
  if (response.status === 401) {
    // Sesión revocada (contraseña, rol o estado cambiados): se vuelve al login.
    useAuthStore.getState().logout(message)
  }
  if (!response.ok) throw new Error(message)
  return body as T
}

const json = (method: string, data: unknown): RequestInit => ({ method, body: JSON.stringify(data) })

export const getUsuarios = () => request<Usuario[]>("")
export const crearUsuario = (data: CrearUsuarioPayload) => request<Usuario>("", json("POST", data))
export const editarUsuario = (id: number, data: EditarUsuarioPayload) => request<Usuario>(`/${id}`, json("PATCH", data))
export const restablecerPassword = (id: number, password: string) =>
  request<void>(`/${id}/password`, json("PUT", { password }))
export const cambiarEstadoUsuario = (id: number, activo: boolean) =>
  request<Usuario>(`/${id}/estado`, json("PATCH", { activo }))

export const getRoles = () => request<Rol[]>("/roles")
export const crearRol = (data: RolPayload) => request<Rol>("/roles", json("POST", data))
export const editarRol = (id: number, data: Partial<RolPayload>) => request<Rol>(`/roles/${id}`, json("PATCH", data))
export const borrarRol = (id: number) => request<void>(`/roles/${id}`, { method: "DELETE" })

export const getPermisos = () => request<Permiso[]>("/permisos")
export const editarPermiso = (id: number, descripcion: string) =>
  request<Pick<Permiso, "id" | "codigo" | "descripcion">>(`/permisos/${id}`, json("PATCH", { descripcion }))
