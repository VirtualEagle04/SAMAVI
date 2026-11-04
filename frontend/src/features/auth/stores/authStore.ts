import { create } from "zustand"
import {
  fetchSession,
  login as authLogin,
  SessionExpiredError,
  type Role,
  type SessionData,
} from "../services/authService"

interface AuthState {
  user: string | null
  role: Role | null
  permissions: string[]
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  /** Motivo de una sesión vencida o revocada; mientras no sea `null` se muestra el aviso. */
  sessionExpired: string | null
  login: (username: string, password: string) => Promise<void>
  /** Relee rol y permisos del backend; cierra la sesión si fue revocada. */
  refreshSession: () => Promise<void>
  logout: (message?: string) => void
  /** Marca la sesión como vencida para avisar al usuario antes de llevarlo al login. */
  expireSession: (message?: string) => void
  clearError: () => void
}

function persistSession({ user, role, permissions }: SessionData) {
  localStorage.setItem("samavi_user", user)
  localStorage.setItem("samavi_role", role)
  localStorage.setItem("samavi_permissions", JSON.stringify(permissions))
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: localStorage.getItem("samavi_user"),
  role: localStorage.getItem("samavi_role"),
  permissions: JSON.parse(localStorage.getItem("samavi_permissions") ?? "[]") as string[],
  token: localStorage.getItem("samavi_token"),
  isAuthenticated: Boolean(localStorage.getItem("samavi_token")),
  isLoading: false,
  error: null,
  sessionExpired: null,

  login: async (username, password) => {
    set({ isLoading: true, error: null })
    try {
      const { user, role, token, permissions } = await authLogin(username, password)
      localStorage.setItem("samavi_token", token)
      persistSession({ user, role, permissions })
      set({ user, role, permissions, token, isAuthenticated: true, isLoading: false })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Error al iniciar sesión",
        isLoading: false,
      })
    }
  },

  refreshSession: async () => {
    const token = get().token
    if (!token) return
    try {
      const session = await fetchSession(token)
      // Si la sesión cambió mientras se consultaba, se descarta el resultado.
      if (get().token !== token) return
      persistSession(session)
      set({ user: session.user, role: session.role, permissions: session.permissions })
    } catch (err) {
      if (err instanceof SessionExpiredError && get().token === token) {
        get().expireSession(err.message)
      }
      // Un fallo de red conserva la sesión guardada: el backend la valida en cada solicitud.
    }
  },

  logout: (message) => {
    localStorage.removeItem("samavi_token")
    localStorage.removeItem("samavi_user")
    localStorage.removeItem("samavi_role")
    localStorage.removeItem("samavi_permissions")
    set({ user: null, role: null, permissions: [], token: null, isAuthenticated: false, error: message ?? null, sessionExpired: null })
  },

  expireSession: (message) => {
    const { isAuthenticated, sessionExpired } = get()
    if (!isAuthenticated || sessionExpired !== null) return
    set({ sessionExpired: message ?? "Tu sesión terminó; inicia sesión de nuevo" })
  },

  clearError: () => set({ error: null }),
}))
