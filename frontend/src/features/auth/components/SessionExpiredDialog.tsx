import Button from "@mui/material/Button"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogTitle from "@mui/material/DialogTitle"
import Stack from "@mui/material/Stack"
import Typography from "@mui/material/Typography"
import LockClockRoundedIcon from "@mui/icons-material/LockClockRounded"
import { useAuthStore } from "../stores/authStore"

const LOGIN_MESSAGE = "Tu sesión terminó; inicia sesión de nuevo"

/**
 * Aviso de sesión vencida o revocada. Aparece cuando una solicitud recibe 401
 * (`apiFetch`) y, al aceptarlo, cierra la sesión; `RequireAuth` lleva al login
 * recordando la ruta actual.
 */
export default function SessionExpiredDialog() {
  const sessionExpired = useAuthStore((state) => state.sessionExpired)
  const logout = useAuthStore((state) => state.logout)

  return (
    <Dialog
      open={sessionExpired !== null}
      maxWidth="xs"
      fullWidth
      aria-labelledby="session-expired-title"
      aria-describedby="session-expired-description"
      // Sin `onClose`: ni Escape ni el fondo lo cierran; solo el botón, porque sin sesión no se puede seguir.
    >
      <DialogTitle id="session-expired-title">
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <LockClockRoundedIcon color="warning" />
          <span>Tu sesión terminó</span>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Typography id="session-expired-description" color="text.secondary">
          Por seguridad, tu sesión venció o fue cerrada. Vuelve a iniciar sesión para continuar; te
          llevaremos a la misma página.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button variant="contained" onClick={() => logout(LOGIN_MESSAGE)} autoFocus>
          Ir a iniciar sesión
        </Button>
      </DialogActions>
    </Dialog>
  )
}
