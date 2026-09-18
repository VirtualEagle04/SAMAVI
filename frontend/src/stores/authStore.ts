import { create } from "zustand"
import { login as authLogin, type Role } from "../services/authService"

interface AuthState {
  user: string | null
  role: Role | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (username: string, password: string) => Promise<void>
  quickLogin: () => void
  logout: () => void
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (username, password) => {
    set({ isLoading: true, error: null })
    try {
      const { user, role } = await authLogin(username, password)
      set({ user, role, isAuthenticated: true, isLoading: false })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Error al iniciar sesión",
        isLoading: false,
      })
    }
  },

  quickLogin: () => {
    set({
      user: "demo",
      role: "Administrador",
      isAuthenticated: true,
      error: null,
    })
  },

  logout: () => {
    set({ user: null, role: null, isAuthenticated: false, error: null })
  },

  clearError: () => set({ error: null }),
}))
