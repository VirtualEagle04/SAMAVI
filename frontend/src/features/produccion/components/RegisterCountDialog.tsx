import { useState, useEffect } from "react"
import type { FormEvent } from "react"
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogTitle from "@mui/material/DialogTitle"
import FormControl from "@mui/material/FormControl"
import Grid from "@mui/material/Grid"
import InputLabel from "@mui/material/InputLabel"
import MenuItem from "@mui/material/MenuItem"
import Select from "@mui/material/Select"
import ToggleButton from "@mui/material/ToggleButton"
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup"
import Typography from "@mui/material/Typography"
import AddCircleOutlineRoundedIcon from "@mui/icons-material/AddCircleOutlineRounded"
import RemoveCircleOutlineRoundedIcon from "@mui/icons-material/RemoveCircleOutlineRounded"
import type { CategoriaPeso, Galpon, RegisterCountPayload } from "../types/produccion.types"

interface RegisterCountDialogProps {
  open: boolean
  onClose: () => void
  onRegister: (payload: RegisterCountPayload) => Promise<void>
  galpones: Galpon[]
  categorias: CategoriaPeso[]
  initialGalponId?: number
  initialCategory?: string
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Y: { bg: "#fef3c7", text: "#92400e", border: "#fde68a" },
  Ex: { bg: "#fce7f3", text: "#9d174d", border: "#fbcfe8" },
  AA: { bg: "#e0f2fe", text: "#075985", border: "#bae6fd" },
  A: { bg: "#dcfce7", text: "#166534", border: "#bbf7d0" },
  B: { bg: "#ffedd5", text: "#9a3412", border: "#fed7aa" },
  C: { bg: "#f3e8ff", text: "#6b21a8", border: "#e9d5ff" },
  P: { bg: "#f1f5f9", text: "#334155", border: "#cbd5e1" },
}

export default function RegisterCountDialog({
  open,
  onClose,
  onRegister,
  galpones,
  categorias,
  initialGalponId,
  initialCategory,
}: RegisterCountDialogProps) {
  const [galponId, setGalponId] = useState<number>(initialGalponId || galpones[0]?.id || 1)
  const [categoriaPeso, setCategoriaPeso] = useState<string>(initialCategory || categorias[0]?.codigo || "AA")
  const [cantidad, setCantidad] = useState<1 | -1>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      if (initialGalponId && galpones.some((g) => g.id === initialGalponId)) {
        setGalponId(initialGalponId)
      } else if (galpones.length > 0) {
        setGalponId(galpones[0].id)
      }

      if (initialCategory && categorias.some((c) => c.codigo === initialCategory)) {
        setCategoriaPeso(initialCategory)
      } else if (categorias.length > 0) {
        setCategoriaPeso(categorias[0].codigo)
      }
      setCantidad(1)
      setError(null)
    }
  }, [open, initialGalponId, initialCategory, galpones, categorias])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      await onRegister({
        galponId,
        categoriaPeso,
        cantidad,
        timestamp: new Date().toISOString(),
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar el conteo")
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
        Registrar Conteo de Producción
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ pt: 1.5, display: "flex", flexDirection: "column", gap: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {/* Galpon Selection */}
          <FormControl fullWidth>
            <InputLabel id="select-galpon-label">Galpón de Recolección</InputLabel>
            <Select
              labelId="select-galpon-label"
              value={galponId}
              label="Galpón de Recolección"
              onChange={(e) => setGalponId(Number(e.target.value))}
              sx={{ borderRadius: 1 }}
            >
              {galpones.map((g) => (
                <MenuItem key={g.id} value={g.id}>
                  {g.nombre} ({g.gallinasActuales.toLocaleString()} aves alojadas) - {g.estado}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Category Visual Selector */}
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700, color: "text.secondary", mb: 1 }}>
              Categoría de Peso
            </Typography>
            <Grid container spacing={1}>
              {categorias.map((cat) => {
                const isSelected = categoriaPeso === cat.codigo
                const colors = CATEGORY_COLORS[cat.codigo] || {
                  bg: "#f1f5f9",
                  text: "#334155",
                  border: "#cbd5e1",
                }

                return (
                  <Grid key={cat.codigo} size={{ xs: 4, sm: 3 }}>
                    <Box
                      onClick={() => setCategoriaPeso(cat.codigo)}
                      sx={{
                        p: 1.2,
                        borderRadius: 1,
                        border: isSelected ? "2px solid" : "1.5px solid",
                        borderColor: isSelected ? "primary.main" : colors.border,
                        bgcolor: isSelected ? "primary.light" : colors.bg,
                        color: isSelected ? "primary.dark" : colors.text,
                        textAlign: "center",
                        cursor: "pointer",
                        transition: "all 0.12s ease",
                        "&:hover": {
                          borderColor: "primary.main",
                        },
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
                        {cat.nombre}
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 600, fontSize: "0.7rem", opacity: 0.85 }}>
                        ({cat.codigo})
                      </Typography>
                    </Box>
                  </Grid>
                )
              })}
            </Grid>
          </Box>

          {/* Action Type (+1 / -1) */}
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700, color: "text.secondary", mb: 1 }}>
              Tipo de Registro
            </Typography>
            <ToggleButtonGroup
              value={cantidad}
              exclusive
              onChange={(_e, val) => {
                if (val !== null) setCantidad(val)
              }}
              fullWidth
              sx={{
                "& .MuiToggleButton-root": {
                  borderRadius: 1,
                  py: 1,
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  textTransform: "none",
                  border: "1.5px solid",
                  borderColor: "divider",
                },
              }}
            >
              <ToggleButton
                value={1}
                sx={{
                  "&.Mui-selected": {
                    bgcolor: "#dcfce7 !important",
                    color: "#166534 !important",
                    borderColor: "#86efac !important",
                  },
                }}
              >
                <AddCircleOutlineRoundedIcon sx={{ mr: 1, fontSize: 18 }} />
                +1 Ingreso / Huevo Contado
              </ToggleButton>
              <ToggleButton
                value={-1}
                sx={{
                  "&.Mui-selected": {
                    bgcolor: "#fee2e2 !important",
                    color: "#b91c1c !important",
                    borderColor: "#fca5a5 !important",
                  },
                }}
              >
                <RemoveCircleOutlineRoundedIcon sx={{ mr: 1, fontSize: 18 }} />
                -1 Descarte / Ajuste
              </ToggleButton>
            </ToggleButtonGroup>
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
            sx={{
              borderRadius: 1,
              px: 2.5,
              fontWeight: 700,
            }}
          >
            {isSubmitting ? "Registrando..." : "Guardar Conteo"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
