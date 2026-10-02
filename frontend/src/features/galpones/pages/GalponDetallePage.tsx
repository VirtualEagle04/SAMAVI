import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import AddRoundedIcon from "@mui/icons-material/AddRounded"
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded"
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded"
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded"
import RestaurantRoundedIcon from "@mui/icons-material/RestaurantRounded"
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Chip from "@mui/material/Chip"
import CircularProgress from "@mui/material/CircularProgress"
import Snackbar from "@mui/material/Snackbar"
import Stack from "@mui/material/Stack"
import Typography from "@mui/material/Typography"
import AlimentacionDialog from "../components/AlimentacionDialog"
import GallinasDialog from "../components/GallinasDialog"
import { cambiarGallinas, getGalpon, registrarAlimentacion } from "../services/galponesService"
import type { CambioGallinasPayload, GalponDetalle, TipoCambioGallinas } from "../types/galpones.types"

const HISTORY_DAYS = 7
const panel = { border: "1px solid", borderColor: "divider", borderRadius: 3, p: { xs: 2, sm: 2.5 } } as const
const time = (value: string) =>
  new Intl.DateTimeFormat("es-CO", { timeStyle: "short", timeZone: "America/Bogota" }).format(new Date(value))
const dateTime = (value: string) =>
  new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" }).format(new Date(value))
const addDays = (date: string, delta: number) => {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}
const dayLabel = (date: string, today: string) =>
  date === today
    ? "Hoy"
    : date === addDays(today, -1)
    ? "Ayer"
    : new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`))

export default function GalponDetallePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const galponId = Number(id)
  const [galpon, setGalpon] = useState<GalponDetalle | null>(null)
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState("")
  const [toast, setToast] = useState("")
  const [feedOpen, setFeedOpen] = useState(false)
  const [hensMode, setHensMode] = useState<TipoCambioGallinas | null>(null)

  const loadData = useCallback(async (initial = false) => {
    if (initial) setLoading(true)
    setPageError("")
    try {
      setGalpon(await getGalpon(galponId))
    } catch (e) {
      setPageError(e instanceof Error ? e.message : "No se pudo cargar el galpón.")
    } finally {
      setLoading(false)
    }
  }, [galponId])
  useEffect(() => {
    void loadData(true)
  }, [loadData])

  const days = useMemo(() => {
    if (!galpon) return []
    return Array.from({ length: HISTORY_DAYS }, (_, index) => {
      const date = addDays(galpon.fechaHoy, -index)
      return { date, record: galpon.alimentaciones.find((row) => row.fecha.slice(0, 10) === date) }
    })
  }, [galpon])

  const back = (
    <Button
      variant="text"
      startIcon={<ArrowBackRoundedIcon />}
      onClick={() => navigate("/galpones")}
      sx={{ alignSelf: "flex-start", ml: -1 }}
    >
      Volver a galpones
    </Button>
  )

  if (loading)
    return (
      <Box sx={{ minHeight: 360, display: "grid", placeItems: "center" }}>
        <CircularProgress />
      </Box>
    )
  if (pageError || !galpon)
    return (
      <Stack spacing={2} sx={{ maxWidth: 700, mx: "auto", py: 4 }}>
        <Alert severity="error">{pageError || "No se pudo cargar el galpón."}</Alert>
        <Button variant="outlined" onClick={() => void loadData(true)}>
          Intentar de nuevo
        </Button>
        {back}
      </Stack>
    )

  const active = galpon.estado === "activo"
  const todayRecord = days[0]?.record

  const handleFeed = async () => {
    await registrarAlimentacion(galpon.id)
    await loadData()
    setToast(`${galpon.nombre} alimentado.`)
  }
  const handleHens = async (data: CambioGallinasPayload) => {
    await cambiarGallinas(galpon.id, data)
    await loadData()
    setToast(data.tipo === "baja" ? "Se redujeron las gallinas." : "Se agregaron las gallinas.")
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 720, width: "100%", mx: "auto" }}>
      {back}

      <Box>
        <Typography variant="h4" sx={{ fontSize: { xs: "1.7rem", sm: "2rem" } }}>
          {galpon.nombre}
        </Typography>
        {!active && <Chip variant="outlined" label={galpon.estado === "inactivo" ? "Inactivo" : "En mantenimiento"} sx={{ mt: 1, fontWeight: 700 }} />}
      </Box>

      {!active && <Alert severity="info">Este galpón no está activo, por eso no se puede registrar nada.</Alert>}

      {active && (
        <Box
          sx={{
            ...panel,
            bgcolor: galpon.alimentadoHoy ? "rgba(52, 199, 89, 0.10)" : "rgba(255, 152, 0, 0.10)",
            borderColor: galpon.alimentadoHoy ? "success.main" : "warning.main",
          }}
        >
          {galpon.alimentadoHoy ? (
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              <CheckCircleRoundedIcon color="success" sx={{ fontSize: 40 }} />
              <Box>
                <Typography sx={{ fontWeight: 800, fontSize: "1.2rem" }}>Ya se alimentó hoy</Typography>
                <Typography color="text.secondary">
                  {galpon.alimentadoEn ? `A las ${time(galpon.alimentadoEn)}` : ""}
                  {todayRecord ? ` · ${todayRecord.usuario}` : ""}
                </Typography>
              </Box>
            </Stack>
          ) : (
            <Stack spacing={1.5}>
              <Typography sx={{ fontWeight: 800, fontSize: "1.2rem" }}>Falta alimentar hoy</Typography>
              <Button variant="contained" size="large" startIcon={<RestaurantRoundedIcon />} onClick={() => setFeedOpen(true)} sx={{ minHeight: 56, fontSize: "1.05rem" }}>
                Registrar alimentación
              </Button>
            </Stack>
          )}
        </Box>
      )}

      <Box sx={panel}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
          GALLINAS
        </Typography>
        <Typography sx={{ fontWeight: 800, fontSize: "2.4rem", lineHeight: 1.1 }}>
          {galpon.gallinasActuales.toLocaleString("en-US")}
        </Typography>
        {active && (
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.2, mt: 2 }}>
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setHensMode("ingreso")} sx={{ minHeight: 52 }}>
              Agregar
            </Button>
            <Button variant="outlined" startIcon={<RemoveRoundedIcon />} onClick={() => setHensMode("baja")} sx={{ minHeight: 52 }}>
              Reducir
            </Button>
          </Box>
        )}
      </Box>

      <Box sx={panel}>
        <Typography sx={{ fontWeight: 800, mb: 1 }}>Alimentación de los últimos días</Typography>
        {days.map(({ date, record }) => (
          <Stack key={date} direction="row" sx={{ justifyContent: "space-between", alignItems: "center", py: 1, borderTop: "1px solid", borderColor: "divider" }}>
            <Typography sx={{ textTransform: "capitalize", fontWeight: date === galpon.fechaHoy ? 800 : 500 }}>{dayLabel(date, galpon.fechaHoy)}</Typography>
            {record ? (
              <Chip size="small" color="success" icon={<CheckCircleRoundedIcon />} label={`${time(record.registradoEn)} · ${record.usuario}`} sx={{ fontWeight: 700 }} />
            ) : (
              <Typography variant="body2" color="text.secondary">{date === galpon.fechaHoy ? "Pendiente" : "Sin registro"}</Typography>
            )}
          </Stack>
        ))}
      </Box>

      <Box sx={panel}>
        <Typography sx={{ fontWeight: 800, mb: 1 }}>Cambios en las gallinas</Typography>
        {galpon.cambiosGallinas.length === 0 && (
          <Typography color="text.secondary" sx={{ pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
            Todavía no hay cambios registrados.
          </Typography>
        )}
        {galpon.cambiosGallinas.map((change) => {
          const data = change.datosNuevos
          if (!data) return null
          const drop = data.tipo === "baja"
          return (
            <Stack key={change.id} direction="row" spacing={1.5} sx={{ justifyContent: "space-between", py: 1.2, borderTop: "1px solid", borderColor: "divider" }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700 }}>{data.causa ?? "Ingreso de gallinas"}</Typography>
                <Typography variant="body2" color="text.secondary">{dateTime(change.fechaHora)} · {change.usuario}</Typography>
              </Box>
              <Typography sx={{ fontWeight: 800, color: drop ? "error.main" : "success.dark", whiteSpace: "nowrap" }}>
                {drop ? "−" : "+"}{data.cantidad.toLocaleString("en-US")}
              </Typography>
            </Stack>
          )
        })}
      </Box>

      <AlimentacionDialog open={feedOpen} nombre={galpon.nombre} onClose={() => setFeedOpen(false)} onSave={handleFeed} />
      {hensMode && <GallinasDialog key={hensMode} mode={hensMode} actuales={galpon.gallinasActuales} onClose={() => setHensMode(null)} onSave={handleHens} />}
      <Snackbar open={Boolean(toast)} autoHideDuration={4500} onClose={() => setToast("")} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity="success" variant="filled" onClose={() => setToast("")}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  )
}
