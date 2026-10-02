import { useState } from "react"
import AddRoundedIcon from "@mui/icons-material/AddRounded"
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded"
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Chip from "@mui/material/Chip"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogTitle from "@mui/material/DialogTitle"
import IconButton from "@mui/material/IconButton"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import type { CambioGallinasPayload, TipoCambioGallinas } from "../types/galpones.types"

const CAUSAS = ["Enfermedad", "Muerte natural", "Calor o estrés", "Depredador", "Venta", "Otra"]
const MAX_AMOUNT = 999999
const stepperSx = { width: 56, height: 56, flexShrink: 0, border: "1.5px solid", borderColor: "primary.main", color: "primary.dark" } as const

type Props = {
  mode: TipoCambioGallinas
  actuales: number
  onClose: () => void
  onSave: (data: CambioGallinasPayload) => Promise<void>
}

export default function GallinasDialog({ mode, actuales, onClose, onSave }: Props) {
  const [amount, setAmount] = useState("")
  const [cause, setCause] = useState("")
  const [otherCause, setOtherCause] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const isDrop = mode === "baja"
  const quantity = Number(amount)
  const resulting = isDrop ? actuales - quantity : actuales + quantity
  const finalCause = cause === "Otra" ? otherCause.trim() : cause

  const submit = async () => {
    if (!quantity) { setError("Escriba cuántas gallinas son."); return }
    if (isDrop && quantity > actuales) { setError(`El galpón solo tiene ${actuales.toLocaleString("en-US")} gallinas.`); return }
    if (isDrop && !finalCause) { setError("Elija o escriba la causa."); return }
    setSaving(true); setError("")
    try {
      await onSave({ tipo: mode, cantidad: quantity, ...(isDrop ? { causa: finalCause } : {}) })
      onClose()
    }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar el cambio.") }
    finally { setSaving(false) }
  }

  return <Dialog open onClose={() => { if (!saving) onClose() }} fullWidth maxWidth="xs" slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
    <DialogTitle sx={{ fontWeight: 800 }}>{isDrop ? "Reducir gallinas" : "Agregar gallinas"}</DialogTitle>
    <DialogContent>
      <Typography color="text.secondary" sx={{ mb: 2 }}>Ahora hay {actuales.toLocaleString("en-US")} gallinas.</Typography>
      <Typography variant="body2" sx={{ mb: 1, fontWeight: 700 }}>{isDrop ? "¿Cuántas salen?" : "¿Cuántas entran?"}</Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
        <IconButton
          aria-label="Una menos"
          onClick={() => setAmount(String(Math.max(0, quantity - 1)))}
          disabled={quantity <= 0 || saving}
          sx={stepperSx}
        >
          <RemoveRoundedIcon />
        </IconButton>
        <TextField
          autoFocus
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").slice(0, 6))}
          slotProps={{ htmlInput: { inputMode: "numeric", "aria-label": isDrop ? "Cantidad que salen" : "Cantidad que entran", style: { textAlign: "center", fontSize: "1.6rem", fontWeight: 800 } } }}
        />
        <IconButton
          aria-label="Una más"
          onClick={() => setAmount(String(quantity + 1))}
          disabled={quantity >= (isDrop ? actuales : MAX_AMOUNT) || saving}
          sx={stepperSx}
        >
          <AddRoundedIcon />
        </IconButton>
      </Box>
      {quantity > 0 && (!isDrop || quantity <= actuales) && (
        <Typography sx={{ mt: 1.5, fontWeight: 700 }}>Quedarían {resulting.toLocaleString("en-US")} gallinas.</Typography>
      )}
      {isDrop && <>
        <Typography sx={{ mt: 2.5, mb: 1, fontWeight: 700 }}>¿Por qué salen?</Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {CAUSAS.map((option) => <Chip
            key={option}
            label={option}
            onClick={() => setCause(option)}
            color={cause === option ? "primary" : "default"}
            variant={cause === option ? "filled" : "outlined"}
            sx={{ height: 40, fontWeight: 700, fontSize: "0.95rem" }}
          />)}
        </Box>
        {cause === "Otra" && <TextField
          sx={{ mt: 2 }}
          label="Escriba la causa"
          value={otherCause}
          onChange={(e) => setOtherCause(e.target.value.slice(0, 200))}
        />}
      </>}
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2.5 }}>
      <Button onClick={onClose} disabled={saving}>Cancelar</Button>
      <Button variant="contained" onClick={() => void submit()} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
    </DialogActions>
  </Dialog>
}
