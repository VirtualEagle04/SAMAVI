import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Card from "@mui/material/Card"
import CardContent from "@mui/material/CardContent"
import Chip from "@mui/material/Chip"
import FormControl from "@mui/material/FormControl"
import Grid from "@mui/material/Grid"
import IconButton from "@mui/material/IconButton"
import MenuItem from "@mui/material/MenuItem"
import Select from "@mui/material/Select"
import Typography from "@mui/material/Typography"
import Tooltip from "@mui/material/Tooltip"
import AddCircleOutlineRoundedIcon from "@mui/icons-material/AddCircleOutlineRounded"
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded"
import RadioButtonCheckedRoundedIcon from "@mui/icons-material/RadioButtonCheckedRounded"
import WifiRoundedIcon from "@mui/icons-material/WifiRounded"
import WifiOffRoundedIcon from "@mui/icons-material/WifiOffRounded"
import AddRoundedIcon from "@mui/icons-material/AddRounded"
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded"
import type { CategoriaPeso, DeviceStatus, Galpon, LogConteo } from "../types/produccion.types"

interface LiveMonitoringCardProps {
  counts: LogConteo[]
  galpones: Galpon[]
  categorias: CategoriaPeso[]
  selectedGalponId: number | "all"
  onSelectGalpon: (id: number | "all") => void
  onRefresh: () => void
  onOpenRegisterModal: (preselectedCategory?: string) => void
  onQuickCount: (categoriaCodigo: string, cantidad: 1 | -1) => void
  isLoading?: boolean
  lastUpdated: Date
  deviceStatus?: DeviceStatus | null
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

export default function LiveMonitoringCard({
  counts,
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
  // Filter counts by today and selected galpon
  const todayDateStr = new Date().toISOString().slice(0, 10)
  const currentCounts = counts.filter((c) => {
    const isToday = c.timestamp.slice(0, 10) === todayDateStr
    const matchGalpon = selectedGalponId === "all" || c.idGalpon === selectedGalponId
    return isToday && matchGalpon
  })

  // Calculate totals
  const totalCount = currentCounts.reduce((sum, c) => sum + c.cantidad, 0)
  const totalBandejas = Math.floor(Math.max(0, totalCount) / 30)
  const totalSobrante = Math.max(0, totalCount) % 30

  // Selected galpon active hens
  const selectedGalponObj = galpones.find((g) => g.id === selectedGalponId)
  const totalHens =
    selectedGalponId === "all"
      ? galpones.reduce((acc, g) => acc + (g.estado === "activo" ? g.gallinasActuales : 0), 0)
      : selectedGalponObj?.gallinasActuales ?? 0

  const posturaPercentage = totalHens > 0 ? ((totalCount / totalHens) * 100).toFixed(1) : "0.0"

  // Counts by category
  const categoryCounts: Record<string, number> = {}
  categorias.forEach((cat) => {
    categoryCounts[cat.codigo] = 0
  })

  currentCounts.forEach((c) => {
    categoryCounts[c.codigoCategoriaPeso] = (categoryCounts[c.codigoCategoriaPeso] || 0) + c.cantidad
  })

  const isEsp32Connected = deviceStatus?.connected ?? false

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 1.5,
        border: "1.5px solid",
        borderColor: isEsp32Connected ? "#22c55e" : "#e2e8f0",
        backgroundColor: "#fcfdfa",
        position: "relative",
        overflow: "hidden",
        boxShadow: isEsp32Connected
          ? "0 2px 10px rgba(34, 197, 94, 0.08)"
          : "0 1px 4px rgba(0,0,0,0.04)",
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
          borderColor: isEsp32Connected ? "#bbf7d0" : "divider",
          backgroundColor: isEsp32Connected ? "#f0fdf4" : "#faf7f2",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1.5 }}>
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
                color: isEsp32Connected ? "#16a34a" : "#64748b",
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
                ? `ESP32 activo en broker MQTT. Última actividad: ${deviceStatus?.lastActivity ? new Date(deviceStatus.lastActivity).toLocaleTimeString() : "reciente"}`
                : "ESP32 no detectado en el broker MQTT. Puedes registrar conteos manualmente."
            }
          >
            <Chip
              icon={
                isEsp32Connected ? (
                  <WifiRoundedIcon sx={{ fontSize: "14px !important", color: "#16a34a !important" }} />
                ) : (
                  <WifiOffRoundedIcon sx={{ fontSize: "14px !important", color: "#94a3b8 !important" }} />
                )
              }
              label={isEsp32Connected ? "ESP32 En Línea" : "ESP32 Desconectado"}
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
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <Select
              value={selectedGalponId}
              onChange={(e) =>
                onSelectGalpon(e.target.value === "all" ? "all" : Number(e.target.value))
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

          <Tooltip title={`Última actualización: ${lastUpdated.toLocaleTimeString()}`}>
            <IconButton
              size="small"
              onClick={onRefresh}
              disabled={isLoading}
              sx={{
                borderRadius: 1,
                bgcolor: "#ffffff",
                border: "1px solid",
                borderColor: isEsp32Connected ? "#86efac" : "divider",
                color: isEsp32Connected ? "#16a34a" : "text.secondary",
                "&:hover": { bgcolor: isEsp32Connected ? "#dcfce7" : "#f1f5f9" },
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
          {/* Hero Total Card */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Box
              sx={{
                height: "100%",
                minHeight: 200,
                p: 2,
                borderRadius: 1.25,
                border: "1.5px solid",
                borderColor: isEsp32Connected ? "#22c55e" : "#cbd5e1",
                backgroundColor: "#ffffff",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
                position: "relative",
              }}
            >
              <Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 1,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 800,
                      letterSpacing: 0.8,
                      textTransform: "uppercase",
                      color: "text.secondary",
                      fontSize: "0.75rem",
                    }}
                  >
                    Total del Lote (Hoy)
                  </Typography>
                  <Chip
                    label={
                      selectedGalponId === "all"
                        ? "General"
                        : galpones.find((g) => g.id === selectedGalponId)?.nombre ?? "Galpón"
                    }
                    size="small"
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.75rem",
                      borderRadius: 1,
                      bgcolor: isEsp32Connected ? "#f0fdf4" : "#f1f5f9",
                      color: isEsp32Connected ? "#166534" : "#475569",
                      border: "1px solid",
                      borderColor: isEsp32Connected ? "#86efac" : "#cbd5e1",
                    }}
                  />
                </Box>

                {/* Big Two Totals for Batch: Bandejas and Huevos */}
                <Box sx={{ display: "flex", alignItems: "baseline", gap: 2, my: 1 }}>
                  <Box>
                    <Typography
                      variant="h2"
                      sx={{
                        fontWeight: 900,
                        color: "primary.dark",
                        letterSpacing: "-1px",
                        lineHeight: 1,
                      }}
                    >
                      {totalBandejas.toLocaleString()}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 800,
                        color: "primary.main",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        fontSize: "0.75rem",
                      }}
                    >
                      Bandejas
                    </Typography>
                  </Box>

                  <Typography variant="h4" sx={{ fontWeight: 400, color: "divider", lineHeight: 1 }}>
                    /
                  </Typography>

                  <Box>
                    <Typography
                      variant="h3"
                      sx={{
                        fontWeight: 800,
                        color: "text.primary",
                        letterSpacing: "-0.5px",
                        lineHeight: 1,
                      }}
                    >
                      {totalSobrante}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        color: "text.secondary",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        fontSize: "0.75rem",
                      }}
                    >
                      Huevos sueltos
                    </Typography>
                  </Box>
                </Box>

                <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary", fontSize: "0.825rem" }}>
                  {totalCount.toLocaleString()} unidades totales recolectadas
                </Typography>
              </Box>

              {/* Postura Ratio and Aves */}
              <Box
                sx={{
                  pt: 1.5,
                  mt: 1.5,
                  borderTop: "1px dashed #e2e8f0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Box>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                    Unidad Estándar
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary" }}>
                    30 huevos / bandeja
                  </Typography>
                </Box>

                {totalHens > 0 && (
                  <Box sx={{ textAlign: "right" }}>
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary", display: "block" }}
                    >
                      Postura Estimada
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 800, color: "#16a34a" }}
                    >
                      {posturaPercentage}% ({totalHens.toLocaleString()} aves)
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Grid>

          {/* Categories Grid Sub-cards */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Grid container spacing={1.5} sx={{ height: "100%" }}>
              {categorias.map((cat) => {
                const count = categoryCounts[cat.codigo] || 0
                // Bandejas (unidad principal) y Huevos (0-29)
                const bandejas = Math.floor(Math.max(0, count) / 30)
                const huevos = Math.max(0, count) % 30
                const percent = totalCount > 0 ? ((count / totalCount) * 100).toFixed(0) : "0"
                const colorInfo = CATEGORY_COLORS[cat.codigo] || {
                  bg: "#f8fafc",
                  text: "#334155",
                  border: "#e2e8f0",
                }

                return (
                  <Grid key={cat.codigo} size={{ xs: 6, sm: 4, md: 4, lg: 3 }}>
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
                        transition: "all 0.15s ease-in-out",
                        "&:hover": {
                          borderColor: "primary.main",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                          transform: "translateY(-1px)",
                        },
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
                          bgcolor: "#faf7f2",
                          border: "1px solid #f0e6dc",
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

                        <Box sx={{ width: "1px", height: 26, bgcolor: "#e2d7ce" }} />

                        {/* 2. Huevos */}
                        <Box sx={{ textAlign: "center" }}>
                          <Typography
                            variant="h5"
                            sx={{
                              fontWeight: 900,
                              color: huevos > 0 ? "text.primary" : "text.disabled",
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

                      {/* Quick Adjust Buttons & Gram range */}
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          pt: 0.8,
                          mt: 0.5,
                          borderTop: "1px dashed #f1f5f9",
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.disabled",
                            fontSize: "0.65rem",
                            fontWeight: 600,
                          }}
                        >
                          {cat.pesoMinG
                            ? `${cat.pesoMinG}g+`
                            : cat.pesoMaxG
                            ? `<${cat.pesoMaxG}g`
                            : ""}
                        </Typography>

                        <Box sx={{ display: "flex", gap: 0.5 }}>
                          <Tooltip title="Descontar / Descarte (-1)">
                            <IconButton
                              size="small"
                              onClick={() => onQuickCount(cat.codigo, -1)}
                              disabled={
                                selectedGalponId === "all" && galpones.length > 1
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
                                selectedGalponId === "all" && galpones.length > 1
                              }
                              sx={{
                                width: 22,
                                height: 22,
                                p: 0,
                                borderRadius: 0.8,
                                bgcolor: "#f0fdf4",
                                color: "#16a34a",
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
                )
              })}
            </Grid>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}
