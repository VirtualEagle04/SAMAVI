import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import WifiRoundedIcon from "@mui/icons-material/WifiRounded";
import WifiOffRoundedIcon from "@mui/icons-material/WifiOffRounded";
import type { DeviceStatus, Galpon } from "../types/produccion.types";
import { formatRelativeTime } from "./liveMonitoring.utils";

interface LiveStatusBarProps {
  galpones: Galpon[];
  selectedGalponId: number | "all";
  onSelectGalpon: (id: number | "all") => void;
  onRefresh: () => void;
  isLoading: boolean;
  lastUpdated: Date;
  deviceStatus?: DeviceStatus | null;
  now: number;
}

export default function LiveStatusBar({
  galpones,
  selectedGalponId,
  onSelectGalpon,
  onRefresh,
  isLoading,
  lastUpdated,
  deviceStatus,
  now,
}: LiveStatusBarProps) {
  const connected = deviceStatus?.connected ?? false;
  const lastActivity = formatRelativeTime(deviceStatus?.lastActivity, now);

  const statusText = connected
    ? `ESP32 en línea${lastActivity ? ` · ${lastActivity}` : ""}`
    : `ESP32 sin conexión${lastActivity ? ` · último dato ${lastActivity}` : ""}`;

  return (
    <Box
      sx={(theme) => ({
        px: { xs: 2, sm: 2.5 },
        py: 1.5,
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        alignItems: { xs: "stretch", md: "center" },
        justifyContent: "space-between",
        gap: 1.5,
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: connected
          ? alpha(theme.palette.success.main, 0.1)
          : alpha(theme.palette.warning.main, 0.1),
      })}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
        <Box
          aria-hidden
          sx={{
            width: 10,
            height: 10,
            flexShrink: 0,
            borderRadius: "50%",
            bgcolor: connected ? "success.main" : "warning.main",
            animation: connected ? "livePulse 2s ease-in-out infinite" : "none",
            "@keyframes livePulse": {
              "0%, 100%": { opacity: 1, transform: "scale(1)" },
              "50%": { opacity: 0.4, transform: "scale(1.4)" },
            },
          }}
        />
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 800, letterSpacing: 0.5, lineHeight: 1.2 }}
          >
            EN VIVO
          </Typography>
          <Tooltip
            title={
              connected
                ? "ESP32 activo en el broker MQTT."
                : "ESP32 no detectado en el broker MQTT. Puedes registrar conteos manualmente."
            }
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                color: connected ? "success.main" : "warning.dark",
              }}
            >
              {connected ? (
                <WifiRoundedIcon sx={{ fontSize: 16 }} />
              ) : (
                <WifiOffRoundedIcon sx={{ fontSize: 16 }} />
              )}
              <Typography
                variant="caption"
                sx={{ fontWeight: 700, color: "inherit" }}
                noWrap
              >
                {statusText}
              </Typography>
            </Box>
          </Tooltip>
        </Box>
      </Box>

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 1,
        }}
      >
        <FormControl
          size="small"
          sx={{ minWidth: { xs: 0, md: 240 }, flex: { xs: "1 1 0", md: "0 0 auto" } }}
        >
          <Select
            value={selectedGalponId}
            onChange={(e) =>
              onSelectGalpon(e.target.value === "all" ? "all" : Number(e.target.value))
            }
            inputProps={{ "aria-label": "Galpón" }}
            sx={{ bgcolor: "background.paper", fontWeight: 700 }}
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
          <span>
            <IconButton
              onClick={onRefresh}
              disabled={isLoading}
              aria-label="Actualizar datos"
              sx={{
                width: 40,
                height: 40,
                borderRadius: "6px",
                bgcolor: "background.paper",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <RefreshRoundedIcon
                fontSize="small"
                sx={{
                  animation: isLoading ? "liveSpin 1s linear infinite" : "none",
                  "@keyframes liveSpin": { "100%": { transform: "rotate(360deg)" } },
                }}
              />
            </IconButton>
          </span>
        </Tooltip>

      </Box>
    </Box>
  );
}
