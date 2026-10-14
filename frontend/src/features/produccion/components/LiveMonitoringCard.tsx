import { useMemo } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import type {
  CategoriaPeso,
  DeviceStatus,
  Galpon,
  LogConteo,
  ResumenConteoDiario,
} from "../types/produccion.types";
import CategoryLiveRow from "./CategoryLiveRow";
import LiveStatusBar from "./LiveStatusBar";
import LiveSummary from "./LiveSummary";
import RecentActivity from "./RecentActivity";
import { useNow } from "./liveMonitoring.utils";

const RECENT_EVENTS_LIMIT = 6;

interface LiveMonitoringCardProps {
  dailyCounts: ResumenConteoDiario[];
  counts: LogConteo[];
  galpones: Galpon[];
  categorias: CategoriaPeso[];
  selectedGalponId: number | "all";
  onSelectGalpon: (id: number | "all") => void;
  onRefresh: () => void;
  onQuickCount: (categoriaCodigo: string, cantidad: 1 | -1) => void;
  isLoading?: boolean;
  lastUpdated: Date;
  deviceStatus?: DeviceStatus | null;
}

export default function LiveMonitoringCard({
  dailyCounts,
  counts,
  galpones,
  categorias,
  selectedGalponId,
  onSelectGalpon,
  onRefresh,
  onQuickCount,
  isLoading = false,
  lastUpdated,
  deviceStatus,
}: LiveMonitoringCardProps) {
  const now = useNow();

  const categoryEggs = useMemo(() => {
    const totals: Record<string, number> = {};
    categorias.forEach((cat) => {
      totals[cat.codigo] = 0;
    });
    dailyCounts
      .filter((row) => selectedGalponId === "all" || row.idGalpon === selectedGalponId)
      .forEach((row) => {
        totals[row.codigoCategoriaPeso] =
          (totals[row.codigoCategoriaPeso] ?? 0) + row.cantidad;
      });
    return totals;
  }, [dailyCounts, categorias, selectedGalponId]);

  const totalEggs = Object.values(categoryEggs).reduce(
    (sum, eggs) => sum + Math.max(0, eggs),
    0,
  );
  const galponTotals = galpones
    .map((g) => ({
      id: g.id,
      nombre: g.nombre,
      eggs: Math.max(
        0,
        dailyCounts
          .filter((row) => row.idGalpon === g.id)
          .reduce((sum, row) => sum + row.cantidad, 0),
      ),
    }))
    .filter(() => selectedGalponId === "all");
  const slices = categorias.map((cat) => ({
    codigo: cat.codigo,
    nombre: cat.nombre,
    eggs: Math.max(0, categoryEggs[cat.codigo] ?? 0),
  }));
  const maxEggs = Math.max(0, ...Object.values(categoryEggs));

  const recentEvents = useMemo(
    () =>
      counts
        .filter((c) => selectedGalponId === "all" || c.idGalpon === selectedGalponId)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, RECENT_EVENTS_LIMIT),
    [counts, selectedGalponId],
  );

  const isEsp32Connected = deviceStatus?.connected ?? false;
  const disableQuickActions = selectedGalponId === "all" && galpones.length > 1;

  return (
    <Card
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: isEsp32Connected ? "success.main" : "divider",
        backgroundColor: "background.paper",
        overflow: "hidden",
      }}
    >
      <LiveStatusBar
        galpones={galpones}
        selectedGalponId={selectedGalponId}
        onSelectGalpon={onSelectGalpon}
        onRefresh={onRefresh}
        isLoading={isLoading}
        lastUpdated={lastUpdated}
        deviceStatus={deviceStatus}
        now={now}
      />

      <LiveSummary totalEggs={totalEggs} galponTotals={galponTotals} slices={slices} />

      {disableQuickActions && (
        <Typography variant="body2" sx={{ px: { xs: 2, sm: 2.5 }, pt: 2, color: "text.secondary", fontWeight: 600 }}>
          Selecciona un galpón para sumar o restar huevos con los botones + / −.
        </Typography>
      )}

      <Box
        role="list"
        aria-label="Producción de hoy por categoría"
        sx={{
          p: { xs: 2, sm: 2.5 },
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
          gap: 1.5,
        }}
      >
        {categorias.map((cat) => (
          <CategoryLiveRow
            key={cat.codigo}
            categoria={cat}
            eggs={categoryEggs[cat.codigo] ?? 0}
            maxEggs={maxEggs}
            disabledActions={disableQuickActions}
            onQuickCount={onQuickCount}
          />
        ))}
      </Box>

      <RecentActivity events={recentEvents} galpones={galpones} now={now} />
    </Card>
  );
}
