import type { Role } from "../services/authService"

export function getDefaultRouteForRole(role: Role): string {
  switch (role) {
    case "Galponero":
      return "/stock"
    case "Administrador":
    case "Vendedor":
      return "/dashboard"
  }
}
