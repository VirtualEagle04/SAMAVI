import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CategoryBadge from "../../../components/atoms/CategoryBadge";
import type { Galpon, LogConteo } from "../types/produccion.types";
import { formatRelativeTime } from "./liveMonitoring.utils";

interface RecentActivityProps {
  events: LogConteo[];
  galpones: Galpon[];
  now: number;
}

export default function RecentActivity({ events, galpones, now }: RecentActivityProps) {
  return (
    <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 2, borderTop: "1px solid", borderColor: "divider" }}>
      <Typography
        variant="caption"
        sx={{ fontWeight: 800, letterSpacing: 0.6, color: "text.secondary" }}
      >
        ACTIVIDAD RECIENTE
      </Typography>

      {events.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          Aún no hay conteos para mostrar.
        </Typography>
      ) : (
        <Box
          role="list"
          sx={{
            mt: 1,
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
            columnGap: 3,
          }}
        >
          {events.map((event) => {
            const galpon = galpones.find((g) => g.id === event.idGalpon);
            return (
              <Box
                key={event.id}
                role="listitem"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  py: 0.75,
                  borderBottom: "1px dashed",
                  borderColor: "divider",
                  minWidth: 0,
                }}
              >
                <CategoryBadge codigo={event.codigoCategoriaPeso} />
                <Typography sx={{ fontWeight: 800, color: event.cantidad > 0 ? "success.main" : "error.main" }}>
                  {event.cantidad > 0 ? "+1" : "−1"}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap sx={{ flex: 1, minWidth: 0 }}>
                  {galpon?.nombre ?? `Galpón ${event.idGalpon}`}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                  {formatRelativeTime(event.timestamp, now)}
                </Typography>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
