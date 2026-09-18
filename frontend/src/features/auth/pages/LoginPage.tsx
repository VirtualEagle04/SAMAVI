import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Typography from "@mui/material/Typography"
import AuthLayout from "../../../components/templates/AuthLayout"
import LoginForm from "../../../components/organisms/LoginForm"
import { useAuthStore } from "../../../stores/authStore"
import type { Role } from "../../../services/authService"

function roleToRoute(role: Role): string {
  if (role === "Administrador") return "/admin"
  if (role === "Galponero") return "/galpon"
  return "/ventas"
}

export default function LoginPage() {
  const { isAuthenticated, role } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated && role) {
      navigate(roleToRoute(role), { replace: true })
    }
  }, [isAuthenticated, role, navigate])

  return (
    <AuthLayout>
      <Typography
        variant="h5"
        sx={{ mb: 0.5, color: "text.primary", textAlign: "center" }}
      >
        Bienvenido
      </Typography>
      <Typography
        variant="body2"
        sx={{ mb: 3.5, color: "text.secondary", textAlign: "center" }}
      >
        Ingresa tus credenciales para continuar
      </Typography>
      <LoginForm />
    </AuthLayout>
  )
}
