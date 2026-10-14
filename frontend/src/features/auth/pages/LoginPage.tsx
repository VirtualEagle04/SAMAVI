import { useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import Typography from "@mui/material/Typography"
import AuthLayout from "../components/AuthLayout"
import LoginForm from "../components/LoginForm"
import { useAuthStore } from "../stores/authStore"
import type { LoginRedirectState } from "../components/RequireAuth"

export default function LoginPage() {
  const { isAuthenticated, role } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as LoginRedirectState | null)?.from

  // Con sesión: vuelve a la ruta protegida pedida o a "/", que elige el módulo
  useEffect(() => {
    if (isAuthenticated && role) {
      navigate(from ? `${from.pathname}${from.search}${from.hash}` : "/", { replace: true })
    }
  }, [isAuthenticated, role, navigate, from])

  return (
    <AuthLayout>
      <Typography
        variant="h2"
        sx={{ mb: 0.75, color: "text.primary", textAlign: "center", fontSize: { xs: "2rem", sm: "2.375rem" } }}
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
