import { useState } from "react"
import type { FormEvent } from "react"
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogTitle from "@mui/material/DialogTitle"
import FormControl from "@mui/material/FormControl"
import InputLabel from "@mui/material/InputLabel"
import MenuItem from "@mui/material/MenuItem"
import Select from "@mui/material/Select"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import LockResetRoundedIcon from "@mui/icons-material/LockResetRounded"
import type { DailyClosePayload, Galpon, LogConteo } from "../types/produccion.types"

interface DailyCloseDialogProps {
  open: boolean
  onClose: () => void
  onCloseDaily: (payload: DailyClosePayload) => Promise<void>
  galpones: Galpon[]
  counts: LogConteo[]
}

export default function DailyCloseDialog({
  open,
  onClose,
  onCloseDaily,
  galpones,
  counts,
}: DailyCloseDialogProps) {
  const todayStr = new Date().toISOString().slice(0, 10)
  const [fecha, setFecha] = useState<string>(todayStr)
  const [galponId, setGalponId] = useState<number | "all">("all")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Calculate preview of counts for chosen date and galpon
  const matchingCounts = counts.filter((c) => {
    const isDate = c.timestamp.slice(0, 10) === fecha
    const isGalpon = galponId === "all" || c.idGalpon === galponId
    return isDate && isGalpon
  })
  const totalEggs = matchingCounts.reduce((acc, c) => acc + c.cantidad, 0)
  const totalBandejas = Math.floor(Math.max(0, totalEggs) / 30)
  const sobrante = Math.max(0, totalEggs) % 30

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      await onCloseDaily({
        fecha,
        ...(galponId !== "all" ? { galponId } : {}),
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al efectuar el cierre diario")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 1.5,
            p: 0.5,
          },
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, fontWeight: 800, fontSize: "1.2rem", color: "text.primary" }}>
        Cierre Diario de Producción
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ pt: 1.5, display: "flex", flexDirection: "column", gap: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            El cierre consolidará los registros de conteo del día seleccionado, agrupándolos en bandejas de 30 unidades y unidades sobrantes para su posterior despacho o almacenamiento en bodega.
          </Typography>

          {/* Date field */}
          <TextField
            label="Fecha de Cierre"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            fullWidth
            required
            slotProps={{
              inputLabel: { shrink: true },
            }}
            sx={{ borderRadius: 1 }}
          />

          {/* Galpon field */}
          <FormControl fullWidth>
            <InputLabel id="select-galpon-cierre">Galpón</InputLabel>
            <Select
              labelId="select-galpon-cierre"
              value={galponId}
              label="Galpón"
              onChange={(e) =>
                setGalponId(e.target.value === "all" ? "all" : Number(e.target.value))
              }
              sx={{ borderRadius: 1 }}
            >
              <MenuItem value="all">
                <em>Todos los galpones</em>
              </MenuItem>
              {galpones.map((g) => (
                <MenuItem key={g.id} value={g.id}>
                  {g.nombre} ({g.gallinasActuales.toLocaleString()} aves)
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Summary Preview Box */}
          <Box
            sx={{
              p: 2,
              borderRadius: 1,
              bgcolor: "#faf7f2",
              border: "1px solid #eadbd2",
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "text.primary", mb: 1 }}>
              Resumen para Liquidación ({fecha}):
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Total Huevos Registrados:
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>
                {totalEggs.toLocaleString()} unidades
              </Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Bandejas Consolidadas (30 uds):
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 800, color: "primary.dark" }}>
                {totalBandejas.toLocaleString()} bandejas
              </Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Unidades Sobrantes:
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 800, color: "text.secondary" }}>
                {sobrante} unidades
              </Typography>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
          <Button onClick={onClose} disabled={isSubmitting} sx={{ borderRadius: 1, color: "text.secondary" }}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            startIcon={<LockResetRoundedIcon />}
            sx={{
              borderRadius: 1,
              px: 2.5,
              fontWeight: 700,
            }}
          >
            {isSubmitting ? "Cerrando..." : "Confirmar Cierre Diario"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
