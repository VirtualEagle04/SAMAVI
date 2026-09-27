import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import PetsRoundedIcon from "@mui/icons-material/PetsRounded";
import type { Galpon, ResumenConteoDiario } from "../types/produccion.types";

interface ProductionKpiCardsProps {
  dailyCounts: ResumenConteoDiario[];
  galpones: Galpon[];
  selectedGalponId: number | "all";
}

export default function ProductionKpiCards({
  dailyCounts,
  galpones,
  selectedGalponId,
}: ProductionKpiCardsProps) {
  const totalTodayEggs = dailyCounts
    .filter((count) => selectedGalponId === "all" || count.idGalpon === selectedGalponId)
    .reduce((total, count) => total + count.cantidad, 0);
  // Total active hens
  const activeHens =
    selectedGalponId === "all"
      ? galpones.reduce(
          (acc, g) => acc + (g.estado === "activo" ? g.gallinasActuales : 0),
          0,
        )
      : (galpones.find((g) => g.id === selectedGalponId)?.gallinasActuales ??
        0);

  const posturaRate =
    activeHens > 0 ? ((totalTodayEggs / activeHens) * 100).toFixed(1) : "0.0";

  return (
    <Grid container spacing={2}>
      {/* KPI 1: Eficiencia de Postura */}
      <Grid size={{ xs: 12, sm: 6 }}>
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
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 1.2,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 700,
                  color: "text.secondary",
                  fontSize: "0.8rem",
                }}
              >
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
            <Typography
              variant="h4"
              sx={{ fontWeight: 800, color: "#16a34a", lineHeight: 1.1 }}
            >
              {posturaRate}%
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontWeight: 600,
                mt: 0.8,
                display: "block",
              }}
            >
              Rendimiento diario por ave alojada
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* KPI 3: Aves y Galpones */}
      <Grid size={{ xs: 12, sm: 6 }}>
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
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 1.2,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 700,
                  color: "text.secondary",
                  fontSize: "0.8rem",
                }}
              >
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
            <Typography
              variant="h4"
              sx={{ fontWeight: 800, color: "text.primary", lineHeight: 1.1 }}
            >
              {activeHens.toLocaleString()}{" "}
              <Typography
                component="span"
                variant="body2"
                sx={{ fontWeight: 600, color: "text.secondary" }}
              >
                aves
              </Typography>
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontWeight: 600,
                mt: 0.8,
                display: "block",
              }}
            >
              {selectedGalponId === "all"
                ? `${galpones.filter((g) => g.estado === "activo").length} galpones en producción`
                : `Estado: ${galpones.find((g) => g.id === selectedGalponId)?.estado ?? "activo"}`}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

    </Grid>
  );
}
