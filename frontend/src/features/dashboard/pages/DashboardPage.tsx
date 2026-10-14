import { useCallback, useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import CalendarViewWeekRoundedIcon from "@mui/icons-material/CalendarViewWeekRounded";
import EmptyState from "../../../components/molecules/EmptyState";
import TableToolbar from "../../../components/molecules/TableToolbar";
import { tableCardSx } from "../../../components/tableStyles";
import CategoryTotalsCard from "../components/CategoryTotalsCard";
import WeekNavigator from "../components/WeekNavigator";
import WeeklySheetTable from "../components/WeeklySheetTable";
import { formatWeekRange } from "../components/weeklySummary.utils";
import { getResumenSemanal } from "../services/dashboardService";
import type { ResumenSemanal } from "../types/dashboard.types";

/**
 * Resumen de la semana productiva: lo que la dueña lleva en el cuaderno
 * (planilla por galpón, producción, ventas y bodega).
 */
export default function DashboardPage() {
  const [desde, setDesde] = useState<string | undefined>(undefined);
  const [data, setData] = useState<ResumenSemanal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async (fecha?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      setData(await getResumenSemanal(fecha));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar el resumen semanal");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(desde);
  }, [desde, load]);

  const hasData = data !== null && data.galpones.length > 0;
  const loadingSx = { opacity: isLoading ? 0.5 : 1, transition: "opacity 150ms" };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: { xs: "stretch", md: "flex-end" },
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontSize: { xs: "1.7rem", sm: "2rem" }, mb: 0.5 }}>
            Resumen semanal
          </Typography>
          <Typography color="text.secondary">
            {data ? formatWeekRange(data.desde, data.hasta) : "Producción, ventas y bodega de la semana."}
          </Typography>
        </Box>
        <WeekNavigator value={data?.desde ?? desde} onChange={setDesde} disabled={isLoading} />
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      {!data && isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress color="primary" />
        </Box>
      ) : (
        <>
          {hasData ? (
            <Box sx={loadingSx}>
              <WeeklySheetTable data={data} />
            </Box>
          ) : (
            <Card elevation={0} sx={{ ...tableCardSx, ...loadingSx }}>
              <TableToolbar title="Planilla de la semana" />
              <EmptyState
                icon={<CalendarViewWeekRoundedIcon />}
                title="Sin producción en la semana"
                description="No hay cierres diarios ni bodega registrados para esta semana."
              />
            </Card>
          )}

          {hasData && (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
                gap: 2,
                ...loadingSx,
              }}
            >
              <CategoryTotalsCard
                title="Producción"
                description="Semana más bodega anterior"
                rows={data.resumen}
                field="produccion"
              />
              <CategoryTotalsCard
                title="Ventas"
                description="Bandejas vendidas en la semana"
                rows={data.resumen}
                field="ventas"
              />
              <CategoryTotalsCard
                title="Bodega"
                description="Lo que queda tras las ventas"
                rows={data.resumen}
                field="bodega"
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
