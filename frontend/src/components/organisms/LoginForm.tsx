import { useState } from "react"
import { useNavigate } from "react-router-dom"
import Box from "@mui/material/Box"
import Stack from "@mui/material/Stack"
import Button from "@mui/material/Button"
import Alert from "@mui/material/Alert"
import CircularProgress from "@mui/material/CircularProgress"
import Divider from "@mui/material/Divider"
import Typography from "@mui/material/Typography"
import LoginFormFields from "../molecules/LoginFormFields"
import { useAuthStore } from "../../stores/authStore"
import type { Role } from "../../services/authService"

const USERNAME_RE = /^[a-zA-Z0-9_]+$/

function validate(username: string, password: string) {
  const errors = { username: "", password: "" }

  if (!username) {
    errors.username = "El usuario no puede estar vacío"
  } else if (!USERNAME_RE.test(username)) {
    errors.username = "El usuario no puede contener símbolos especiales"
  }

  if (!password) {
    errors.password = "La contraseña no puede estar vacía"
  } else if (password.length < 8) {
    errors.password = "La contraseña debe tener mínimo 8 caracteres"
  }

  return errors
}

function roleToRoute(role: Role): string {
  if (role === "Administrador") return "/admin"
  if (role === "Galponero") return "/galpon"
  return "/ventas"
}

export default function LoginForm() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [fieldErrors, setFieldErrors] = useState({ username: "", password: "" })
  const [touched, setTouched] = useState(false)

  const { login, quickLogin, isLoading, error, clearError } =
    useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    const errors = validate(username, password)
    setFieldErrors(errors)
    if (errors.username || errors.password) return

    clearError()
    await login(username, password)

    const updatedRole = useAuthStore.getState().role
    if (updatedRole) {
      navigate(roleToRoute(updatedRole), { replace: true })
    }
  }

  const handleQuickLogin = () => {
    quickLogin()
    navigate("/admin", { replace: true })
  }

  const handleUsernameChange = (v: string) => {
    setUsername(v)
    if (touched) setFieldErrors((e) => ({ ...e, username: validate(v, password).username }))
    if (error) clearError()
  }

  const handlePasswordChange = (v: string) => {
    setPassword(v)
    if (touched) setFieldErrors((e) => ({ ...e, password: validate(username, v).password }))
    if (error) clearError()
  }

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Stack spacing={3}>
        {error && (
          <Alert severity="error" sx={{ fontSize: "1rem", fontWeight: 600 }}>
            {error}
          </Alert>
        )}

        <LoginFormFields
          username={username}
          password={password}
          usernameError={fieldErrors.username}
          passwordError={fieldErrors.password}
          disabled={isLoading}
          onUsernameChange={handleUsernameChange}
          onPasswordChange={handlePasswordChange}
        />

        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={isLoading}
          sx={{ mt: 1, py: 1.5 }}
        >
          {isLoading ? (
            <CircularProgress size={24} sx={{ color: "#fff" }} />
          ) : (
            "Iniciar Sesión"
          )}
        </Button>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Divider sx={{ flex: 1 }} />
          <Typography variant="body2" sx={{ color: "text.disabled", flexShrink: 0 }}>
            o
          </Typography>
          <Divider sx={{ flex: 1 }} />
        </Box>

        <Button
          variant="outlined"
          fullWidth
          color="primary"
          onClick={handleQuickLogin}
          disabled={isLoading}
          sx={{ borderStyle: "dashed", color: "text.secondary", borderColor: "divider" }}
        >
          Acceso Rápido (Demo)
        </Button>
      </Stack>
    </Box>
  )
}
