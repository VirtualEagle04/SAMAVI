import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import { CATEGORY_COLORS } from "../../../components/atoms/CategoryBadge";
import AddCircleOutlineRoundedIcon from "@mui/icons-material/AddCircleOutlineRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import RadioButtonCheckedRoundedIcon from "@mui/icons-material/RadioButtonCheckedRounded";
import WifiRoundedIcon from "@mui/icons-material/WifiRounded";
import WifiOffRoundedIcon from "@mui/icons-material/WifiOffRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import type {
  CategoriaPeso,
  DeviceStatus,
  Galpon,
  ResumenConteoDiario,
} from "../types/produccion.types";

interface LiveMonitoringCardProps {
  dailyCounts: ResumenConteoDiario[];
  galpones: Galpon[];
  categorias: CategoriaPeso[];
  selectedGalponId: number | "all";
  onSelectGalpon: (id: number | "all") => void;
  onRefresh: () => void;
  onOpenRegisterModal: (preselectedCategory?: string) => void;
  onQuickCount: (categoriaCodigo: string, cantidad: 1 | -1) => void;
  isLoading?: boolean;
  lastUpdated: Date;
  deviceStatus?: DeviceStatus | null;
}

export default function LiveMonitoringCard({
  dailyCounts,
  galpones,
  categorias,
  selectedGalponId,
  onSelectGalpon,
  onRefresh,
  onOpenRegisterModal,
  onQuickCount,
  isLoading = false,
  lastUpdated,
  deviceStatus,
}: LiveMonitoringCardProps) {
  const currentCounts = dailyCounts.filter(
    (count) => selectedGalponId === "all" || count.idGalpon === selectedGalponId,
  );
  const totalCount = currentCounts.reduce((sum, count) => sum + count.cantidad, 0);

  const categoryCounts: Record<string, number> = {};
  categorias.forEach((cat) => {
    categoryCounts[cat.codigo] = 0;
  });

  currentCounts.forEach((count) => {
    categoryCounts[count.codigoCategoriaPeso] = count.cantidad;
  });

  const isEsp32Connected = deviceStatus?.connected ?? false;

  return (
    <Card
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: isEsp32Connected ? "success.main" : "divider",
        backgroundColor: "background.paper",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Top Banner Header */}
      <Box
        sx={{
          px: { xs: 2, sm: 2.5 },
          py: 1.5,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1.5,
          borderBottom: "1px solid",
          borderColor: isEsp32Connected ? "success.light" : "divider",
          backgroundColor: isEsp32Connected ? "rgba(107, 142, 98, 0.12)" : "background.default",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 1.5,
          }}
        >
          {/* Live indicator badge */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.8,
              bgcolor: isEsp32Connected ? "#dcfce7" : "#f1f5f9",
              px: 1.2,
              py: 0.4,
              borderRadius: 1,
              border: "1px solid",
              borderColor: isEsp32Connected ? "#86efac" : "#cbd5e1",
            }}
          >
            <RadioButtonCheckedRoundedIcon
              sx={{
                color: isEsp32Connected ? "success.main" : "text.secondary",
                fontSize: 16,
                animation: isEsp32Connected ? "pulse 2s infinite" : "none",
                "@keyframes pulse": {
                  "0%": { opacity: 1, transform: "scale(1)" },
                  "50%": { opacity: 0.4, transform: "scale(1.2)" },
                  "100%": { opacity: 1, transform: "scale(1)" },
                },
              }}
            />
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 800,
                color: isEsp32Connected ? "#166534" : "#475569",
                letterSpacing: 0.5,
                fontSize: "0.825rem",
              }}
            >
              MONITOREO EN TIEMPO REAL
            </Typography>
          </Box>

          {/* ESP32 Status Pill */}
          <Tooltip
            title={
              isEsp32Connected
                ? `ESP32 activo en broker MQTT. Ãšltima actividad: ${deviceStatus?.lastActivity ? new Date(deviceStatus.lastActivity).toLocaleTimeString() : "reciente"}`
                : "ESP32 no detectado en el broker MQTT. Puedes registrar conteos manualmente."
            }
          >
            <Chip
              icon={
                isEsp32Connected ? (
                  <WifiRoundedIcon
                    sx={{
                      fontSize: "14px !important",
                      color: "success.main !important",
                    }}
                  />
                ) : (
                  <WifiOffRoundedIcon
                    sx={{
                      fontSize: "14px !important",
                      color: "#94a3b8 !important",
                    }}
                  />
                )
              }
              label={isEsp32Connected ? "ESP32 En LÃ­nea" : "ESP32 Desconectado"}
              size="small"
              sx={{
                fontSize: "0.75rem",
                fontWeight: 700,
                borderRadius: 1,
                bgcolor: isEsp32Connected ? "#ffffff" : "#f8fafc",
                color: isEsp32Connected ? "#15803d" : "#64748b",
                border: "1px solid",
                borderColor: isEsp32Connected ? "#86efac" : "#cbd5e1",
                height: 24,
              }}
            />
          </Tooltip>
        </Box>

        {/* Controls: Galpon filter, Refresh, Register count button */}
        <Box sx={{ display: "flex", width: { xs: "100%", sm: "auto" }, flexWrap: "wrap", alignItems: "center", gap: 1 }}>
          <FormControl size="small" sx={{ minWidth: { xs: 0, sm: 160 }, flex: { xs: "1 1 0", sm: "0 0 auto" } }}>
            <Select
              value={selectedGalponId}
              onChange={(e) =>
                onSelectGalpon(
                  e.target.value === "all" ? "all" : Number(e.target.value),
                )
              }
              sx={{
                borderRadius: 1,
                bgcolor: "#ffffff",
                fontSize: "0.85rem",
                fontWeight: 700,
                color: "text.primary",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: isEsp32Connected ? "#86efac" : "divider",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: isEsp32Connected ? "#22c55e" : "primary.main",
                },
              }}
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

          <Tooltip
            title={`Última Actualización: ${lastUpdated.toLocaleTimeString()}`}
          >
            <IconButton
              size="small"
              onClick={onRefresh}
              disabled={isLoading}
              sx={{
                borderRadius: 1,
                bgcolor: "#ffffff",
                border: "1px solid",
                borderColor: isEsp32Connected ? "#86efac" : "divider",
                color: isEsp32Connected ? "success.main" : "text.secondary",
                "&:hover": {
                  bgcolor: isEsp32Connected ? "#dcfce7" : "#f1f5f9",
                },
              }}
            >
              <RefreshRoundedIcon
                fontSize="small"
                sx={{
                  animation: isLoading ? "spin 1s linear infinite" : "none",
                  "@keyframes spin": {
                    "100%": { transform: "rotate(360deg)" },
                  },
                }}
              />
            </IconButton>
          </Tooltip>

          <Button
            variant="contained"
            size="small"
            startIcon={<AddCircleOutlineRoundedIcon />}
            onClick={() => onOpenRegisterModal()}
            sx={{
              width: { xs: "100%", sm: "auto" },
              borderRadius: 1,
              backgroundColor: "primary.main",
              color: "#ffffff",
              fontSize: "0.85rem",
              fontWeight: 700,
              px: 1.8,
              minHeight: 36,
              boxShadow: "none",
              "&:hover": { backgroundColor: "primary.dark" },
            }}
          >
            Registrar Conteo
          </Button>
        </Box>
      </Box>

      {/* Main Content Area */}
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Grid container spacing={2} sx={{ alignItems: "stretch" }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ p: { xs: 1.5, sm: 2.5 }, border: "1px solid", borderColor: "divider", borderRadius: 2, bgcolor: "background.paper" }}>
              <Typography variant="h5">
                Bandejas por Categoría
              </Typography>
              {(() => {
                const values = categorias.map((cat) => ({
                  ...cat,
                  huevos: Math.max(0, categoryCounts[cat.codigo] || 0),
                  bandejas: Math.floor(Math.max(0, categoryCounts[cat.codigo] || 0) / 30),
                })).sort((a, b) => b.huevos - a.huevos);
                const maxHuevos = Math.max(1, ...values.map((item) => item.huevos));

                return (
                  <Box role="list" aria-label="Produccion por categoria, de mayor a menor" sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1.25 }}>
                    {values.map((item) => {
                      const color = CATEGORY_COLORS[item.codigo]?.border ?? "#9A8E80";
                      const share = totalCount > 0 ? Math.round((item.huevos / totalCount) * 100) : 0;
                      const barWidth = (item.huevos / maxHuevos) * 100;
                      return (
                        <Box key={item.codigo} role="listitem">
                          <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", alignItems: "center", gap: 1, mb: 0.5 }}>
                            <Box sx={{ minWidth: 0, display: "flex", alignItems: "baseline", gap: 0.75 }}>
                              <Typography variant="body2" sx={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.nombre}</Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>{share}%</Typography>
                            </Box>
                            <Typography sx={{ color, fontWeight: 800, whiteSpace: "nowrap" }}>{item.bandejas} <Typography component="span" variant="caption" color="text.secondary">bandejas</Typography></Typography>
                          </Box>
                          <Box role="progressbar" aria-label={`${item.nombre}: ${share}% de la produccion`} aria-valuemin={0} aria-valuemax={maxHuevos} aria-valuenow={item.huevos} sx={{ height: 9, borderRadius: 5, bgcolor: "background.default", overflow: "hidden" }}>
                            <Box sx={{ width: `${barWidth}%`, height: "100%", minWidth: item.huevos > 0 ? 4 : 0, borderRadius: 5, bgcolor: color, transition: "width 240ms ease" }} />
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                );
              })()}
            </Box>
          </Grid>
          {/* Categories Grid Sub-cards */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Grid container spacing={1.5} sx={{ height: "100%" }}>
              {categorias.map((cat) => {
                const count = categoryCounts[cat.codigo] || 0;
                // Bandejas (unidad principal) y Huevos (0-29)
                const bandejas = Math.floor(Math.max(0, count) / 30);
                const huevos = Math.max(0, count) % 30;
                const percent =
                  totalCount > 0
                    ? ((count / totalCount) * 100).toFixed(0)
                    : "0";
                const colorInfo = CATEGORY_COLORS[cat.codigo] || {
                  bg: "#F0ECE7",
                  text: "#51483F",
                  border: "#9A8E80",
                };

                return (
                  <Grid key={cat.codigo} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 1.25,
                        border: `1.5px solid ${colorInfo.border}`,
                        backgroundColor: "#ffffff",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                      }}
                    >
                      {/* Category Header */}
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          mb: 1,
                        }}
                      >
                        <Chip
                          label={cat.nombre}
                          size="small"
                          sx={{
                            fontWeight: 800,
                            fontSize: "0.75rem",
                            borderRadius: 0.8,
                            bgcolor: colorInfo.bg,
                            color: colorInfo.text,
                            border: `1px solid ${colorInfo.border}`,
                            height: 22,
                          }}
                        />
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 700,
                            color: "text.secondary",
                            fontSize: "0.7rem",
                          }}
                        >
                          {percent}%
                        </Typography>
                      </Box>

                      {/* TWO BIG NUMBERS: 1. Bandejas (Principal) & 2. Huevos (0-29) */}
                      <Box
                        sx={{
                          my: 0.5,
                          p: 1,
                          borderRadius: 1,
                          bgcolor: "background.default",
                          border: "1px solid",
                          borderColor: "divider",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-around",
                          gap: 1,
                        }}
                      >
                        {/* 1. Bandejas */}
                        <Box sx={{ textAlign: "center" }}>
                          <Typography
                            variant="h5"
                            sx={{
                              fontWeight: 900,
                              color: "primary.dark",
                              lineHeight: 1,
                            }}
                          >
                            {bandejas}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: "0.65rem",
                              fontWeight: 800,
                              color: "primary.main",
                              textTransform: "uppercase",
                              letterSpacing: 0.3,
                              display: "block",
                              mt: 0.3,
                            }}
                          >
                            Bandejas
                          </Typography>
                        </Box>

                        <Box
                          sx={{ width: "1px", height: 26, bgcolor: "#e2d7ce" }}
                        />

                        {/* 2. Huevos */}
                        <Box sx={{ textAlign: "center" }}>
                          <Typography
                            variant="h5"
                            sx={{
                              fontWeight: 900,
                              color:
                                huevos > 0 ? "text.primary" : "text.disabled",
                              lineHeight: 1,
                            }}
                          >
                            {huevos}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              color: "text.secondary",
                              textTransform: "uppercase",
                              letterSpacing: 0.3,
                              display: "block",
                              mt: 0.3,
                            }}
                          >
                            Huevos
                          </Typography>
                        </Box>
                      </Box>

                      {/* Quick adjustment controls */}
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          pt: 0.8,
                          mt: 0.5,
                          borderTop: "1px dashed #f1f5f9",
                        }}
                      >
                        <Box sx={{ display: "flex", gap: 0.5 }}>
                          <Tooltip title="Descontar / Descarte (-1)">
                            <IconButton
                              size="small"
                              onClick={() => onQuickCount(cat.codigo, -1)}
                              disabled={
                                selectedGalponId === "all" &&
                                galpones.length > 1
                              }
                              sx={{
                                width: 22,
                                height: 22,
                                p: 0,
                                borderRadius: 0.8,
                                bgcolor: "#fef2f2",
                                color: "#ef4444",
                                border: "1px solid #fecaca",
                                "&:hover": { bgcolor: "#fee2e2" },
                                "&.Mui-disabled": { opacity: 0.4 },
                              }}
                            >
                              <RemoveRoundedIcon sx={{ fontSize: 13 }} />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Agregar Conteo (+1)">
                            <IconButton
                              size="small"
                              onClick={() => onQuickCount(cat.codigo, 1)}
                              disabled={
                                selectedGalponId === "all" &&
                                galpones.length > 1
                              }
                              sx={{
                                width: 22,
                                height: 22,
                                p: 0,
                                borderRadius: 0.8,
                                bgcolor: "rgba(107, 142, 98, 0.12)",
                                color: "success.main",
                                border: "1px solid #bbf7d0",
                                "&:hover": { bgcolor: "#dcfce7" },
                                "&.Mui-disabled": { opacity: 0.4 },
                              }}
                            >
                              <AddRoundedIcon sx={{ fontSize: 13 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
