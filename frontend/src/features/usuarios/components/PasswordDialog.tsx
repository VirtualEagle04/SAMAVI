import { useState } from "react"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogContentText from "@mui/material/DialogContentText"
import DialogTitle from "@mui/material/DialogTitle"
import FeedbackAlert from "../../../components/organisms/FeedbackAlert"
import type { Usuario } from "../types/usuarios.types"
import PasswordField from "./PasswordField"

type Props = {
  usuario: Usuario
  onClose: () => void
  onSave: (password: string) => Promise<void>
}

export default function PasswordDialog({ usuario, onClose, onSave }: Props) {
  const [password, setPassword] = useState("")
  const [confirmacion, setConfirmacion] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<{ campo: "password" | "confirmacion" | null; message: string } | null>(null)

  const submit = async () => {
    if (!password) { setError({ campo: "password", message: "Escribe la contraseña nueva." }); return }
    if (password !== confirmacion) { setError({ campo: "confirmacion", message: "Las contraseñas no coinciden." }); return }
    setSaving(true)
    setError(null)
    try {
      await onSave(password)
      onClose()
    } catch (e) {
      const message = e instanceof Error ? e.message : "No se pudo cambiar la contraseña."
      setError({ campo: message.toLowerCase().includes("contraseña") ? "password" : null, message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onClose={() => { if (!saving) onClose() }} fullWidth maxWidth="xs" aria-labelledby="password-title">
      <DialogTitle id="password-title" sx={{ fontWeight: 700 }}>Restablecer contraseña</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          {usuario.esPropio
            ? "Es tu propia cuenta: al guardar se cerrará tu sesión y deberás entrar con la contraseña nueva."
            : `Se cerrarán las sesiones abiertas de ${usuario.nombre} (${usuario.login}). Entrégale la contraseña nueva por un medio seguro.`}
        </DialogContentText>
        <Box
          component="form"
          noValidate
          onSubmit={(event) => { event.preventDefault(); void submit() }}
          sx={{ display: "grid", gap: 2 }}
        >
          {/* Ayuda a los gestores de contraseñas a asociar la contraseña con la cuenta. */}
          <input type="text" name="username" value={usuario.login} autoComplete="username" readOnly hidden />
          <PasswordField
            label="Contraseña nueva"
            value={password}
            onChange={setPassword}
            disabled={saving}
            autoFocus
            error={error?.campo === "password" ? error.message : undefined}
          />
          <PasswordField
            label="Repite la contraseña"
            value={confirmacion}
            onChange={setConfirmacion}
            disabled={saving}
            error={error?.campo === "confirmacion" ? error.message : undefined}
          />
          {error && error.campo === null && <FeedbackAlert severity="error">{error.message}</FeedbackAlert>}
          <button type="submit" hidden />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button variant="contained" onClick={() => void submit()} disabled={saving}>
          {saving ? "Guardando…" : "Cambiar contraseña"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
