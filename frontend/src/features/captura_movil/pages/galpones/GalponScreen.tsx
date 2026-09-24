import { useState } from "react"
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Card from "@mui/material/Card"
import Chip from "@mui/material/Chip"
import CircularProgress from "@mui/material/CircularProgress"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogTitle from "@mui/material/DialogTitle"
import FormControl from "@mui/material/FormControl"
import IconButton from "@mui/material/IconButton"
import InputLabel from "@mui/material/InputLabel"
import MenuItem from "@mui/material/MenuItem"
import Select from "@mui/material/Select"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import AddRoundedIcon from "@mui/icons-material/AddRounded"
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded"
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded"
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded"
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded"
import RestaurantRoundedIcon from "@mui/icons-material/RestaurantRounded"
import { useTheme } from "@mui/material/styles"
import type { AjusteAvesPayload, CapturaGalpon, CausaBaja } from "../../types/captura.types"

interface GalponScreenProps {
  galpones?: CapturaGalpon[]
  causasBaja?: CausaBaja[]
  isLoading?: boolean
  error?: string | null
  onBack: () => void
  onRefresh?: () => void
  onAdjustBirds?: (payload: AjusteAvesPayload) => Promise<void>
  onRegisterFeeding?: (galponId: number) => Promise<void>
}

type Modal = null | "add" | "remove"

const DEFAULT_CAUSAS: CausaBaja[] = [
  { codigo: "ENFERMEDAD", nombre: "Enfermedad" },
  { codigo: "DEPREDADOR", nombre: "Depredador" },
  { codigo: "DESCARTE_NATURAL", nombre: "Descarte natural" },
  { codigo: "ACCIDENTE", nombre: "Accidente" },
  { codigo: "OTRA", nombre: "Otra causa" },
]

function formatNumber(value: number): string {
  return value.toLocaleString("es-CO")
}

function formatCurrentDate(): string {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date())
}

function PageHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
      <IconButton aria-label="Volver" onClick={onBack} size="small">
        <ArrowBackRoundedIcon />
      </IconButton>
      <Box>
        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800 }}>
          Galponero
        </Typography>
        <Typography variant="h5">{title}</Typography>
      </Box>
    </Box>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card variant="outlined" sx={{ p: 4, textAlign: "center" }}>
      <Typography color="text.secondary">{message}</Typography>
    </Card>
  )
}

function GalponDetail({
  galpon,
  causasBaja,
  onBack,
  onAdjustBirds,
  onRegisterFeeding,
}: {
  galpon: CapturaGalpon
  causasBaja: CausaBaja[]
  onBack: () => void
  onAdjustBirds?: (payload: AjusteAvesPayload) => Promise<void>
  onRegisterFeeding?: (galponId: number) => Promise<void>
}) {
  const theme = useTheme()
  const [modal, setModal] = useState<Modal>(null)
  const [quantity, setQuantity] = useState(1)
  const [cause, setCause] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const closeModal = () => {
    if (isSubmitting) return
    setModal(null)
    setQuantity(1)
    setCause("")
    setError(null)
  }

  const handleAdjustBirds = async () => {
    if (!onAdjustBirds || quantity <= 0 || (modal === "remove" && !cause)) return

    setIsSubmitting(true)
    setError(null)
    try {
      await onAdjustBirds({
        galponId: galpon.id,
        cantidad: modal === "add" ? quantity : -quantity,
        ...(modal === "remove" ? { causa: cause } : {}),
      })
      closeModal()
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "No se pudo guardar el ajuste")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRegisterFeeding = async () => {
    if (!onRegisterFeeding) return

    setIsSubmitting(true)
    setError(null)
    try {
      await onRegisterFeeding(galpon.id)
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "No se pudo registrar la alimentación")
    } finally {
      setIsSubmitting(false)
    }
  }

  const canAdjust = Boolean(onAdjustBirds)
  const canRegisterFeeding = Boolean(onRegisterFeeding)

  return (
    <Box sx={{ minHeight: "100%", bgcolor: "background.default", p: { xs: 2, sm: 3 } }}>
      <PageHeader title={galpon.nombre} onBack={onBack} />

      <Card variant="outlined" sx={{ p: 2, mb: 3, borderTop: `4px solid ${theme.palette.primary.main}` }}>
        <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="overline" color="text.secondary">Total aves</Typography>
            <Typography variant="h4" sx={{ fontWeight: 900 }}>{formatNumber(galpon.aves)}</Typography>
          </Box>
          <Box sx={{ flex: 2 }}>
            <Typography variant="overline" color="text.secondary">Raza</Typography>
            <Typography sx={{ fontWeight: 700 }}>{galpon.raza || "Sin información"}</Typography>
          </Box>
          <Box>
            <Typography variant="overline" color="text.secondary">Estado</Typography>
            <Chip label={galpon.estado} color={galpon.estado === "activo" ? "success" : "default"} size="small" />
          </Box>
        </Box>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800 }}>Gestión de aves</Typography>
      <Card variant="outlined" sx={{ p: 2, mb: 3, mt: 1 }}>
        <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1.5 }}>
          <Button fullWidth variant="contained" startIcon={<AddRoundedIcon />} disabled={!canAdjust} onClick={() => setModal("add")}>
            Agregar aves
          </Button>
          <Button fullWidth variant="outlined" startIcon={<RemoveRoundedIcon />} disabled={!canAdjust} onClick={() => setModal("remove")}>
            Dar de baja
          </Button>
        </Box>
        {!canAdjust && <Typography variant="caption" color="text.secondary">Acción pendiente de conexión con el backend.</Typography>}
      </Card>

      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800 }}>Alimentación del día</Typography>
      <Card variant="outlined" sx={{ p: 2, mt: 1 }}>
        {galpon.alimentacionHoy ? (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, py: 2 }}>
            <CheckCircleRoundedIcon color="success" sx={{ fontSize: 52 }} />
            <Typography variant="h6" color="success.main">Alimentado hoy</Typography>
            {galpon.alimentacionHora && <Typography variant="body2" color="text.secondary">Registrado a las {galpon.alimentacionHora}</Typography>}
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Alert severity="warning">Alimentación pendiente para hoy, {formatCurrentDate()}</Alert>
            <Button variant="contained" startIcon={<RestaurantRoundedIcon />} disabled={!canRegisterFeeding || isSubmitting} onClick={handleRegisterFeeding}>
              {isSubmitting ? "Guardando..." : "Registrar alimentación"}
            </Button>
          </Box>
        )}
      </Card>

      <Dialog open={modal !== null} onClose={closeModal} fullWidth maxWidth="xs">
        <DialogTitle>{modal === "add" ? "Agregar aves" : "Dar de baja aves"}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField
              label="Cantidad"
              type="number"
              value={quantity}
              onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
              slotProps={{ htmlInput: { min: 1, max: modal === "remove" ? galpon.aves : undefined } }}
              autoFocus
            />
            {modal === "remove" && (
              <FormControl fullWidth>
                <InputLabel id="causa-baja-label">Causa de la baja</InputLabel>
                <Select labelId="causa-baja-label" label="Causa de la baja" value={cause} onChange={(event) => setCause(event.target.value)}>
                  {causasBaja.map((item) => <MenuItem key={item.codigo} value={item.codigo}>{item.nombre}</MenuItem>)}
                </Select>
              </FormControl>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeModal} color="inherit" disabled={isSubmitting}>Cancelar</Button>
          <Button variant="contained" onClick={handleAdjustBirds} disabled={isSubmitting || quantity > galpon.aves && modal === "remove" || modal === "remove" && !cause}>
            {isSubmitting ? <CircularProgress size={20} color="inherit" /> : "Confirmar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default function GalponScreen({
  galpones = [],
  causasBaja = DEFAULT_CAUSAS,
  isLoading = false,
  error = null,
  onBack,
  onRefresh,
  onAdjustBirds,
  onRegisterFeeding,
}: GalponScreenProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const selectedGalpon = galpones.find((galpon) => galpon.id === selectedId)

  if (selectedGalpon) {
    return (
      <GalponDetail
        galpon={selectedGalpon}
        causasBaja={causasBaja}
        onBack={() => setSelectedId(null)}
        onAdjustBirds={onAdjustBirds}
        onRegisterFeeding={onRegisterFeeding}
      />
    )
  }

  const totalBirds = galpones.reduce((sum, galpon) => sum + galpon.aves, 0)
  const fedCount = galpones.filter((galpon) => galpon.alimentacionHoy).length

  return (
    <Box sx={{ minHeight: "100%", bgcolor: "background.default", p: { xs: 2, sm: 3 } }}>
      <PageHeader title="Seleccionar galpón" onBack={onBack} />

      {onRefresh && <Button onClick={onRefresh} sx={{ mb: 2 }}>Actualizar</Button>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {isLoading && <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>}
      {!isLoading && galpones.length === 0 && <EmptyState message="No hay galpones disponibles para este usuario." />}

      {!isLoading && galpones.length > 0 && (
        <>
          <Card variant="outlined" sx={{ p: 2, mb: 3 }}>
            <Box sx={{ display: "flex", gap: 3 }}>
              <Box>
                <Typography variant="overline" color="text.secondary">Total aves</Typography>
                <Typography variant="h4" sx={{ fontWeight: 900 }}>{formatNumber(totalBirds)}</Typography>
              </Box>
              <Box>
                <Typography variant="overline" color="text.secondary">Alimentados hoy</Typography>
                <Typography variant="h4" sx={{ fontWeight: 900 }}>{fedCount}/{galpones.length}</Typography>
              </Box>
            </Box>
          </Card>

          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800 }}>Mis galpones</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, mt: 1 }}>
            {galpones.map((galpon) => (
              <Card
                key={galpon.id}
                component="button"
                type="button"
                variant="outlined"
                onClick={() => setSelectedId(galpon.id)}
                sx={{ p: 2, textAlign: "left", cursor: "pointer", borderTop: 3, borderTopColor: "primary.main", "&:hover": { boxShadow: 3 } }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">{galpon.nombre}</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900 }}>{formatNumber(galpon.aves)}</Typography>
                    <Typography variant="body2" color="text.secondary">aves</Typography>
                  </Box>
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 }}>
                    <Chip label={galpon.alimentacionHoy ? "Alimentado" : "Pendiente"} color={galpon.alimentacionHoy ? "success" : "default"} size="small" />
                    <ChevronRightRoundedIcon color="primary" />
                  </Box>
                </Box>
              </Card>
            ))}
          </Box>
        </>
      )}
    </Box>
  )
}
