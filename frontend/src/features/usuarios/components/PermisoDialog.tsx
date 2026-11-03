import { useState } from "react"
import Button from "@mui/material/Button"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogContentText from "@mui/material/DialogContentText"
import DialogTitle from "@mui/material/DialogTitle"
import TextField from "@mui/material/TextField"
import type { Permiso } from "../types/usuarios.types"

type Props = {
  permiso: Permiso
  onClose: () => void
  onSave: (descripcion: string) => Promise<void>
}

export default function PermisoDialog({ permiso, onClose, onSave }: Props) {
  const [descripcion, setDescripcion] = useState(permiso.descripcion)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const submit = async () => {
    if (!descripcion.trim()) { setError("Escribe la descripción."); return }
    setSaving(true)
    setError("")
    try {
      await onSave(descripcion.trim())
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la descripción.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onClose={() => { if (!saving) onClose() }} fullWidth maxWidth="sm" aria-labelledby="permiso-title">
      <DialogTitle id="permiso-title" sx={{ fontWeight: 700 }}>Descripción de {permiso.codigo}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          El código lo define el sistema y no cambia; la descripción es el texto que se muestra al asignar permisos a un rol.
        </DialogContentText>
        <TextField
          label="Descripción"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value.slice(0, 150))}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void submit() } }}
          required
          autoFocus
          fullWidth
          disabled={saving}
          error={Boolean(error)}
          helperText={error || `${descripcion.length}/150`}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button variant="contained" onClick={() => void submit()} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
      </DialogActions>
    </Dialog>
  )
}
