import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Card from "@mui/material/Card"
import CardContent from "@mui/material/CardContent"
import Grid from "@mui/material/Grid"
import Typography from "@mui/material/Typography"
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded"
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded"
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded"
import PendingActionsRoundedIcon from "@mui/icons-material/PendingActionsRounded"
import PetsRoundedIcon from "@mui/icons-material/PetsRounded"
import type { CierreDiario, Galpon, LogConteo } from "../types/produccion.types"

interface ProductionKpiCardsProps {
  counts: LogConteo[]
  cierres: CierreDiario[]
  galpones: Galpon[]
  selectedGalponId: number | "all"
  onOpenDailyCloseModal: () => void
  canPerformClose: boolean
}

export default function ProductionKpiCards({
  counts,
  cierres,
  galpones,
  selectedGalponId,
  onOpenDailyCloseModal,
  canPerformClose,
}: ProductionKpiCardsProps) {
  const todayStr = new Date().toISOString().slice(0, 10)

  // Current day counts
  const todayCounts = counts.filter((c) => {
    const isToday = c.timestamp.slice(0, 10) === todayStr
    const matchGalpon = selectedGalponId === "all" || c.idGalpon === selectedGalponId
    return isToday && matchGalpon
  })
  const totalTodayEggs = todayCounts.reduce((acc, c) => acc + c.cantidad, 0)
  const totalBandejas = Math.floor(Math.max(0, totalTodayEggs) / 30)
  const sobrante = Math.max(0, totalTodayEggs) % 30

  // Total active hens
  const activeHens =
    selectedGalponId === "all"
      ? galpones.reduce((acc, g) => acc + (g.estado === "activo" ? g.gallinasActuales : 0), 0)
      : galpones.find((g) => g.id === selectedGalponId)?.gallinasActuales ?? 0

  const posturaRate = activeHens > 0 ? ((totalTodayEggs / activeHens) * 100).toFixed(1) : "0.0"

  // Check if today has a closed production
  const todayClosures = cierres.filter((c) => {
    const cierreDateStr = c.fecha.slice(0, 10)
    const matchGalpon = selectedGalponId === "all" || c.idGalpon === selectedGalponId
    return cierreDateStr === todayStr && matchGalpon
  })
  const isClosedToday = todayClosures.length > 0
  const closedBandejas = todayClosures.reduce((acc, c) => acc + c.cantidadBandejas, 0)

  return (
    <Grid container spacing={2}>
      {/* KPI 1: Producción Acumulada */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card
          elevation={0}
          sx={{
            height: "100%",
            borderRadius: 1.25,
            border: "1px solid",
            borderColor: "divider",
            backgroundColor: "background.paper",
            p: 0.5,
          }}
        >
          <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.2 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "text.secondary", fontSize: "0.8rem" }}>
                PRODUCCIÓN DEL DÍA
              </Typography>
              <Box
                sx={{
                  p: 0.8,
                  borderRadius: 1,
                  bgcolor: "#fef2f2",
                  color: "primary.main",
                  display: "flex",
                }}
              >
                <Inventory2RoundedIcon sx={{ fontSize: 18 }} />
              </Box>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: "text.primary", lineHeight: 1.1 }}>
              {totalTodayEggs.toLocaleString()}{" "}
              <Typography component="span" variant="body2" sx={{ fontWeight: 600, color: "text.secondary" }}>
                uds
              </Typography>
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, mt: 0.8, display: "block" }}>
              {totalBandejas} bandejas completas • {sobrante} sobrantes
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* KPI 2: Eficiencia de Postura */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card
          elevation={0}
          sx={{
            height: "100%",
            borderRadius: 1.25,
            border: "1px solid",
            borderColor: "divider",
            backgroundColor: "background.paper",
            p: 0.5,
          }}
        >
          <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.2 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "text.secondary", fontSize: "0.8rem" }}>
                TASA DE POSTURA
              </Typography>
              <Box
                sx={{
                  p: 0.8,
                  borderRadius: 1,
                  bgcolor: "#f0fdf4",
                  color: "#16a34a",
                  display: "flex",
                }}
              >
                <TrendingUpRoundedIcon sx={{ fontSize: 18 }} />
              </Box>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: "#16a34a", lineHeight: 1.1 }}>
              {posturaRate}%
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, mt: 0.8, display: "block" }}>
              Rendimiento diario por ave alojada
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* KPI 3: Aves y Galpones */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card
          elevation={0}
          sx={{
            height: "100%",
            borderRadius: 1.25,
            border: "1px solid",
            borderColor: "divider",
            backgroundColor: "background.paper",
            p: 0.5,
          }}
        >
          <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.2 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "text.secondary", fontSize: "0.8rem" }}>
                POBLACIÓN ACTIVA
              </Typography>
              <Box
                sx={{
                  p: 0.8,
                  borderRadius: 1,
                  bgcolor: "#fef3c7",
                  color: "#d97706",
                  display: "flex",
                }}
              >
                <PetsRoundedIcon sx={{ fontSize: 18 }} />
              </Box>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: "text.primary", lineHeight: 1.1 }}>
              {activeHens.toLocaleString()}{" "}
              <Typography component="span" variant="body2" sx={{ fontWeight: 600, color: "text.secondary" }}>
                aves
              </Typography>
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, mt: 0.8, display: "block" }}>
              {selectedGalponId === "all"
                ? `${galpones.filter((g) => g.estado === "activo").length} galpones en producción`
                : `Estado: ${galpones.find((g) => g.id === selectedGalponId)?.estado ?? "activo"}`}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* KPI 4: Estado del Cierre Diario */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card
          elevation={0}
          sx={{
            height: "100%",
            borderRadius: 1.25,
            border: "1px solid",
            borderColor: isClosedToday ? "#bbf7d0" : "#fed7aa",
            backgroundColor: isClosedToday ? "#f0fdf4" : "#fffaf5",
            p: 0.5,
          }}
        >
          <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.2 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "text.secondary", fontSize: "0.8rem" }}>
                CIERRE DIARIO
              </Typography>
              <Box
                sx={{
                  p: 0.8,
                  borderRadius: 1,
                  bgcolor: isClosedToday ? "#dcfce7" : "#ffedd5",
                  color: isClosedToday ? "#16a34a" : "#ea580c",
                  display: "flex",
                }}
              >
                {isClosedToday ? (
                  <CheckCircleRoundedIcon sx={{ fontSize: 18 }} />
                ) : (
                  <PendingActionsRoundedIcon sx={{ fontSize: 18 }} />
                )}
              </Box>
            </Box>

            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                color: isClosedToday ? "#166534" : "#c2410c",
                lineHeight: 1.2,
                mb: 0.5,
              }}
            >
              {isClosedToday ? `Cerrado (${closedBandejas} band.)` : "Recolección en Curso"}
            </Typography>

            {canPerformClose && (
              <Button
                variant="outlined"
                size="small"
                onClick={onOpenDailyCloseModal}
                sx={{
                  mt: 0.5,
                  fontSize: "0.75rem",
                  minHeight: 28,
                  py: 0.2,
                  px: 1.2,
                  borderRadius: 1,
                  fontWeight: 700,
                  borderColor: isClosedToday ? "#86efac" : "primary.main",
                  color: isClosedToday ? "#15803d" : "primary.main",
                  "&:hover": {
                    bgcolor: isClosedToday ? "#dcfce7" : "primary.light",
                  },
                }}
              >
                {isClosedToday ? "Re-liquidar Cierre" : "Efectuar Cierre"}
              </Button>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
