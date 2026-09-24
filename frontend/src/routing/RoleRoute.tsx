import type { ReactNode } from "react"
import { Navigate, useLocation } from "react-router-dom"
import type { Role } from "../services/authService"
import { useAuthStore } from "../stores/authStore"
import { getDefaultRouteForRole } from "./roleRouting"

interface RoleRouteProps {
  children: ReactNode
  allowedRoles?: Role[]
}

export default function RoleRoute({ children, allowedRoles }: RoleRouteProps) {
  const location = useLocation()
  const { isAuthenticated, role } = useAuthStore()

  if (!isAuthenticated || !role) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={getDefaultRouteForRole(role)} replace />
  }

  return <>{children}</>
}
