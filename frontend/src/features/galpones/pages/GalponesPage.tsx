import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded"
import RestaurantRoundedIcon from "@mui/icons-material/RestaurantRounded"
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Card from "@mui/material/Card"
import CardActionArea from "@mui/material/CardActionArea"
import Chip from "@mui/material/Chip"
import CircularProgress from "@mui/material/CircularProgress"
import Divider from "@mui/material/Divider"
import LinearProgress from "@mui/material/LinearProgress"
import Stack from "@mui/material/Stack"
import Typography from "@mui/material/Typography"
import { getGalpones } from "../services/galponesService"
import type { EstadoGalpon, GalponResumen } from "../types/galpones.types"

const estadoLabel: Record<EstadoGalpon, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
  mantenimiento: "En mantenimiento",
}
const today = () =>
  new Intl.DateTimeFormat("es-CO", { dateStyle: "full", timeZone: "America/Bogota" }).format(new Date())

export default function GalponesPage() {
  const navigate = useNavigate()
  const [galpones, setGalpones] = useState<GalponResumen[]>([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState("")

  const loadData = useCallback(async (initial = false) => {
    if (initial) setLoading(true)
    setPageError("")
    try {
      setGalpones(await getGalpones())
    } catch (e) {
      setPageError(e instanceof Error ? e.message : "No se pudo cargar la información de los galpones.")
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    void loadData(true)
  }, [loadData])

  const summary = useMemo(() => {
    const active = galpones.filter((g) => g.estado === "activo")
    return {
      active: active.length,
      fed: active.filter((g) => g.alimentadoHoy).length,
      hens: active.reduce((sum, g) => sum + g.gallinasActuales, 0),
    }
  }, [galpones])

  if (loading)
    return (
      <Box sx={{ minHeight: 360, display: "grid", placeItems: "center" }}>
        <CircularProgress />
      </Box>
    )
  if (pageError)
    return (
      <Stack spacing={2} sx={{ maxWidth: 700, mx: "auto", py: 4 }}>
        <Alert severity="error">{pageError}</Alert>
        <Button variant="outlined" onClick={() => void loadData(true)}>
          Intentar de nuevo
        </Button>
      </Stack>
    )

  const fedPercent = summary.active ? (summary.fed / summary.active) * 100 : 0

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 1.5, sm: 3 } }}>
      <Box sx={{ display: { xs: "none", sm: "block" } }}>
        <Typography variant="h4" sx={{ fontSize: "2rem", mb: 0.5 }}>
          Galpones
        </Typography>
        <Typography color="text.secondary" sx={{ textTransform: "capitalize" }}>
          {today()}
        </Typography>
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "stretch",
          gap: 2,
          px: { xs: 1, sm: 2 },
          py: 0.5,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase" }}>
            Alimentados hoy
          </Typography>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: "1.5rem", sm: "1.8rem" }, lineHeight: 1.2 }}>
            {summary.fed} de {summary.active}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={fedPercent}
            color="success"
            sx={{ mt: 0.8, height: 6, borderRadius: 3, bgcolor: "divider" }}
          />
        </Box>
        <Divider orientation="vertical" flexItem />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase" }}>
            Gallinas en producción
          </Typography>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: "1.5rem", sm: "1.8rem" }, lineHeight: 1.2 }}>
            {summary.hens.toLocaleString("en-US")}
          </Typography>
        </Box>
      </Box>

      {galpones.length === 0 ? (
        <Alert severity="info">Todavía no hay galpones registrados.</Alert>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", lg: "repeat(4, 1fr)" },
            gap: { xs: 1.2, sm: 1.5 },
          }}
        >
          {galpones.map((galpon) => {
            const active = galpon.estado === "activo"
            const content = (
              <Box
                sx={{
                  height: "100%",
                  p: 1.5,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1,
                  textAlign: "center",
                }}
              >
                <Typography sx={{ fontWeight: 800, fontSize: { xs: "1.05rem", sm: "1.2rem" }, lineHeight: 1.2 }}>
                  {galpon.nombre}
                </Typography>
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: { xs: "1.7rem", sm: "2rem" }, lineHeight: 1.1 }}>
                    {galpon.gallinasActuales.toLocaleString("en-US")}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    gallinas
                  </Typography>
                </Box>
                {active ? (
                  <Chip
                    icon={galpon.alimentadoHoy ? <CheckCircleRoundedIcon /> : <RestaurantRoundedIcon />}
                    color={galpon.alimentadoHoy ? "success" : "warning"}
                    variant={galpon.alimentadoHoy ? "filled" : "outlined"}
                    label={galpon.alimentadoHoy ? "Alimentado" : "Sin alimentar"}
                    sx={{ fontWeight: 700 }}
                  />
                ) : (
                  <Chip variant="outlined" label={estadoLabel[galpon.estado]} sx={{ fontWeight: 700 }} />
                )}
              </Box>
            )
            return (
              <Card
                key={galpon.id}
                elevation={0}
                sx={{
                  aspectRatio: "1 / 1",
                  borderRadius: 4,
                  border: "1px solid",
                  borderColor: "divider",
                  boxShadow: "none",
                  opacity: active ? 1 : 0.55,
                  bgcolor: active ? "background.paper" : "action.hover",
                }}
              >
                {active ? (
                  <CardActionArea sx={{ height: "100%" }} onClick={() => navigate(`/galpones/${galpon.id}`)}>
                    {content}
                  </CardActionArea>
                ) : (
                  content
                )}
              </Card>
            )
          })}
        </Box>
      )}
    </Box>
  )
}
