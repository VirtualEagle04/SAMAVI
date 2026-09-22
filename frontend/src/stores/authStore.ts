import { create } from "zustand"
import { login as authLogin, type Role } from "../services/authService"

interface AuthState {
  user: string | null
  role: Role | null
  permissions: string[]
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: localStorage.getItem("samavi_user"),
  role: (localStorage.getItem("samavi_role") as Role | null) ?? null,
  permissions: JSON.parse(localStorage.getItem("samavi_permissions") ?? "[]") as string[],
  token: localStorage.getItem("samavi_token"),
  isAuthenticated: Boolean(localStorage.getItem("samavi_token")),
  isLoading: false,
  error: null,

  login: async (username, password) => {
    set({ isLoading: true, error: null })
    try {
      const { user, role, token, permissions } = await authLogin(username, password)
      localStorage.setItem("samavi_token", token)
      localStorage.setItem("samavi_user", user)
      localStorage.setItem("samavi_role", role)
      localStorage.setItem("samavi_permissions", JSON.stringify(permissions))
      set({ user, role, permissions, token, isAuthenticated: true, isLoading: false })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Error al iniciar sesión",
        isLoading: false,
      })
    }
  },

  logout: () => {
    localStorage.removeItem("samavi_token")
    localStorage.removeItem("samavi_user")
    localStorage.removeItem("samavi_role")
    localStorage.removeItem("samavi_permissions")
    set({ user: null, role: null, permissions: [], token: null, isAuthenticated: false, error: null })
  },

  clearError: () => set({ error: null }),
}))
