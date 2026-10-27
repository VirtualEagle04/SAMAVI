import type { ReactElement } from "react"
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded"
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded"
import EggIcon from "@mui/icons-material/Egg"
import HomeWorkRoundedIcon from "@mui/icons-material/HomeWorkRounded"
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded"
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded"
import { useAuthStore } from "./features/auth/stores/authStore"
import type { Role } from "./features/auth/services/authService"

export type ModuleId = "dashboard" | "consolidacion" | "produccion" | "comercial" | "galpones" | "inventario"

export type AppModule = {
  id: ModuleId
  /** Ruta base del módulo; sus subrutas se declaran en AppRouter. */
  path: string
  /** Texto del sidebar. */
  label: string
  /** Título del header. */
  title: string
  icon: ReactElement
  canAccess: (role: Role | null, permissions: string[]) => boolean
}

/**
 * Registro de módulos del shell. El orden define el sidebar y el módulo por
 * defecto (el primero accesible para el usuario).
 */
export const APP_MODULES: AppModule[] = [
  {
    id: "dashboard",
    path: "/dashboard",
    label: "Dashboard",
    title: "Resumen Semanal",
    icon: <DashboardRoundedIcon fontSize="small" />,
    canAccess: (role, permissions) =>
      role === "Administrador" || permissions.includes("VER_CIERRE"),
  },
  {
    id: "consolidacion",
    path: "/consolidacion",
    label: "Cierre semanal",
    title: "Cierre Semanal y Prorrateo",
    icon: <AccountBalanceWalletRoundedIcon fontSize="small" />,
    canAccess: (role, permissions) =>
      role === "Administrador" || permissions.includes("VER_CIERRE"),
  },
  {
    id: "produccion",
    path: "/produccion",
    label: "Producción",
    title: "Módulo de Producción",
    icon: <EggIcon fontSize="small" />,
    canAccess: (role, permissions) =>
      role === "Administrador" ||
      role === "Galponero" ||
      permissions.includes("VER_PRODUCCION"),
  },
  {
    id: "comercial",
    path: "/comercial",
    label: "Comercial",
    title: "Módulo Comercial",
    icon: <StorefrontRoundedIcon fontSize="small" />,
    canAccess: (role, permissions) =>
      role === "Administrador" ||
      role === "Vendedor" ||
      permissions.includes("INGRESAR_PEDIDO") ||
      permissions.includes("REGISTRAR_VENTA"),
  },
  {
    id: "galpones",
    path: "/galpones",
    label: "Galpones",
    title: "Módulo de Galpones",
    icon: <HomeWorkRoundedIcon fontSize="small" />,
    canAccess: (role, permissions) =>
      role === "Administrador" || permissions.includes("GESTIONAR_GALPONES"),
  },
  {
    id: "inventario",
    path: "/inventario",
    label: "Inventario",
    title: "Módulo de Inventario",
    icon: <Inventory2RoundedIcon fontSize="small" />,
    canAccess: (role, permissions) =>
      role === "Administrador" || permissions.includes("GESTIONAR_INVENTARIO"),
  },
]

/** Módulos que el usuario autenticado puede abrir, en el orden del sidebar. */
export function useAccessibleModules(): AppModule[] {
  const role = useAuthStore((state) => state.role)
  const permissions = useAuthStore((state) => state.permissions)
  return APP_MODULES.filter((module) => module.canAccess(role, permissions))
}
