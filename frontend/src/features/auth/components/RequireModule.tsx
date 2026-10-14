import { Navigate, Outlet } from "react-router-dom"
import { useAccessibleModules, type ModuleId } from "../../../modules"

type RequireModuleProps = { module: ModuleId }

/**
 * Guarda de permisos por módulo: sin acceso redirige a "/", que resuelve el
 * módulo por defecto del usuario.
 */
export default function RequireModule({ module }: RequireModuleProps) {
  const accessible = useAccessibleModules()
  if (!accessible.some((candidate) => candidate.id === module)) {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}
