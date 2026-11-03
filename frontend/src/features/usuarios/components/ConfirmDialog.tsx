import { useState } from "react"
import Button from "@mui/material/Button"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogContentText from "@mui/material/DialogContentText"
import DialogTitle from "@mui/material/DialogTitle"
import FeedbackAlert from "../../../components/organisms/FeedbackAlert"

type Props = {
  title: string
  message: string
  confirmLabel: string
  /** Acción destructiva: el botón se muestra en rojo. */
  danger?: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
}

export default function ConfirmDialog({ title, message, confirmLabel, danger, onClose, onConfirm }: Props) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const confirm = async () => {
    setSaving(true)
    setError("")
    try {
      await onConfirm()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar la acción.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onClose={() => { if (!saving) onClose() }} fullWidth maxWidth="xs" aria-labelledby="confirm-title" aria-describedby="confirm-message">
      <DialogTitle id="confirm-title" sx={{ fontWeight: 700 }}>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText id="confirm-message">{message}</DialogContentText>
        {error && <FeedbackAlert severity="error" sx={{ mt: 2 }}>{error}</FeedbackAlert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        {/* El foco inicial va a Cancelar para que Enter no confirme por accidente. */}
        <Button onClick={onClose} disabled={saving} autoFocus>Cancelar</Button>
        <Button variant="contained" color={danger ? "error" : "primary"} onClick={() => void confirm()} disabled={saving}>
          {saving ? "Procesando…" : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
