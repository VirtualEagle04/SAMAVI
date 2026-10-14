import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded"
import RestaurantRoundedIcon from "@mui/icons-material/RestaurantRounded"
import PetsRoundedIcon from "@mui/icons-material/PetsRounded"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Card from "@mui/material/Card"
import CardActionArea from "@mui/material/CardActionArea"
import CardContent from "@mui/material/CardContent"
import Chip from "@mui/material/Chip"
import CircularProgress from "@mui/material/CircularProgress"
import Grid from "@mui/material/Grid"
import Stack from "@mui/material/Stack"
import Typography from "@mui/material/Typography"
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded"
import HomeWorkRoundedIcon from "@mui/icons-material/HomeWorkRounded"
import EmptyState from "../../../components/molecules/EmptyState"
import TableToolbar from "../../../components/molecules/TableToolbar"
import { tableCardSx } from "../../../components/tableStyles"
import { pluralize } from "../../../utils/plural"
import FeedbackAlert from "../../../components/organisms/FeedbackAlert"
import SurfaceCard from "../../../components/atoms/SurfaceCard"
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
        <FeedbackAlert severity="error">{pageError}</FeedbackAlert>
        <Button variant="outlined" onClick={() => void loadData(true)}>
          Intentar de nuevo
        </Button>
      </Stack>
    )

  const fedPercent = summary.active ? Math.round((summary.fed / summary.active) * 100) : 0
  const kpis = [
    {
      label: "ALIMENTADOS HOY",
      value: `${summary.fed} de ${summary.active}`,
      caption: `${fedPercent}% de los galpones activos`,
      icon: <RestaurantRoundedIcon sx={{ fontSize: 18 }} />,
      iconBg: "rgba(107, 142, 98, 0.12)",
      iconColor: "success.main",
      valueColor: "success.main",
    },
    {
      label: "GALLINAS EN PRODUCCIÓN",
      value: summary.hens.toLocaleString("en-US"),
      caption: "Total en galpones activos",
      icon: <PetsRoundedIcon sx={{ fontSize: 18 }} />,
      iconBg: "warning.light",
      iconColor: "warning.dark",
      valueColor: "text.primary",
    },
  ]

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

      <Grid container spacing={2}>
        {kpis.map((kpi) => (
          <Grid key={kpi.label} size={{ xs: 6 }}>
            <Card
              elevation={0}
              sx={{ height: "100%", border: "1px solid", borderColor: "divider", backgroundColor: "background.paper", p: 0.5 }}
            >
              <CardContent sx={{ p: { xs: 1.5, sm: 2 }, "&:last-child": { pb: { xs: 1.5, sm: 2 } } }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: "text.secondary", fontSize: { xs: "0.7rem", sm: "0.8rem" } }}>
                    {kpi.label}
                  </Typography>
                  <Box sx={{ p: 0.8, borderRadius: 1, bgcolor: kpi.iconBg, color: kpi.iconColor, display: "flex" }}>
                    {kpi.icon}
                  </Box>
                </Box>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 800, color: kpi.valueColor, lineHeight: 1.1, fontSize: { xs: "1.15rem", sm: "1.5rem" }, overflowWrap: "anywhere" }}
                >
                  {kpi.value}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, mt: 0.8, display: "block" }}>
                  {kpi.caption}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <SurfaceCard sx={tableCardSx}>
        <TableToolbar
          title="Galpones registrados"
          description={`${pluralize(galpones.length, "galpón", "galpones")} · toca uno activo para registrar alimentación y cambios de gallinas.`}
        />
        {galpones.length === 0 ? (
          <EmptyState
            icon={<HomeWorkRoundedIcon />}
            title="Aún no hay galpones"
            description="Cuando se registren aparecerán aquí."
          />
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
              gap: 1.5,
              p: { xs: 1.5, sm: 2 },
            }}
          >
            {galpones.map((galpon) => {
              const active = galpon.estado === "activo"
              const pending = active && !galpon.alimentadoHoy
              const content = (
                <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5, textAlign: "left" }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                      <Box
                        sx={{
                          p: 0.8,
                          borderRadius: 1,
                          display: "flex",
                          bgcolor: active ? "rgba(92, 67, 51, 0.08)" : "action.hover",
                          color: active ? "primary.main" : "text.disabled",
                        }}
                      >
                        <HomeWorkRoundedIcon sx={{ fontSize: 20 }} />
                      </Box>
                      <Typography noWrap sx={{ fontWeight: 700, fontSize: "1.05rem" }}>
                        {galpon.nombre}
                      </Typography>
                    </Box>
                    {active ? (
                      <Chip
                        size="small"
                        icon={galpon.alimentadoHoy ? <CheckCircleRoundedIcon /> : <RestaurantRoundedIcon />}
                        color={galpon.alimentadoHoy ? "success" : "warning"}
                        variant={galpon.alimentadoHoy ? "filled" : "outlined"}
                        label={galpon.alimentadoHoy ? "Alimentado" : "Sin alimentar"}
                        sx={{ fontWeight: 700 }}
                      />
                    ) : (
                      <Chip size="small" variant="outlined" label={estadoLabel[galpon.estado]} sx={{ fontWeight: 700 }} />
                    )}
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      pt: 1.5,
                      borderTop: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.75 }}>
                      <Typography sx={{ fontWeight: 800, fontSize: "1.75rem", lineHeight: 1.1 }}>
                        {galpon.gallinasActuales.toLocaleString("en-US")}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                        gallinas
                      </Typography>
                    </Box>
                    {active && <ChevronRightRoundedIcon sx={{ color: "text.secondary" }} />}
                  </Box>
                </Box>
              )
              return (
                <SurfaceCard
                  key={galpon.id}
                  sx={{
                    opacity: active ? 1 : 0.6,
                    bgcolor: active ? "background.paper" : "action.hover",
                    borderColor: pending ? "warning.main" : "divider",
                    transition: "border-color 0.2s ease",
                    "&:hover": active ? { borderColor: "primary.main" } : undefined,
                  }}
                >
                  {active ? (
                    <CardActionArea onClick={() => navigate(`/galpones/${galpon.id}`)}>{content}</CardActionArea>
                  ) : (
                    content
                  )}
                </SurfaceCard>
              )
            })}
          </Box>
        )}
      </SurfaceCard>
    </Box>
  )
}
