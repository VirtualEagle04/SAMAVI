import { useState } from "react"
import Alert from "@mui/material/Alert"
import Button from "@mui/material/Button"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogTitle from "@mui/material/DialogTitle"
import Typography from "@mui/material/Typography"

type Props = { open: boolean; nombre: string; onClose: () => void; onSave: () => Promise<void> }

export default function AlimentacionDialog({ open, nombre, onClose, onSave }: Props) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const submit = async () => {
    setSaving(true); setError("")
    try { await onSave(); onClose() }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo registrar la alimentación.") }
    finally { setSaving(false) }
  }

  return <Dialog open={open} onClose={() => { if (!saving) onClose() }} fullWidth maxWidth="xs" slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
    <DialogTitle sx={{ fontWeight: 800 }}>¿Ya alimentó el {nombre}?</DialogTitle>
    <DialogContent>
      <Typography color="text.secondary">Se guardará la hora de ahora. Solo se puede registrar una vez al día.</Typography>
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2.5 }}>
      <Button onClick={onClose} disabled={saving}>Todavía no</Button>
      <Button variant="contained" onClick={() => void submit()} disabled={saving}>{saving ? "Guardando…" : "Sí, ya alimenté"}</Button>
    </DialogActions>
  </Dialog>
}
