import { Navigate, Outlet, useLocation, type Location } from "react-router-dom"
import { useAuthStore } from "../stores/authStore"

/** Estado con el que se llega a /login: la ruta protegida que se quiso abrir. */
export type LoginRedirectState = { from?: Location }

/** Guarda de sesión: sin sesión redirige a /login recordando la ruta pedida. */
export default function RequireAuth() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const location = useLocation()

  if (!isAuthenticated) {
    const state: LoginRedirectState = { from: location }
    return <Navigate to="/login" replace state={state} />
  }

  return <Outlet />
}
