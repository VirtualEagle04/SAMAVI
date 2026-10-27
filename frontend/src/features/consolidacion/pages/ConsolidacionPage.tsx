import { useCallback, useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import LockOpenRoundedIcon from "@mui/icons-material/LockOpenRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import ModuleTabs from "../../../components/molecules/ModuleTabs";
import FeedbackAlert from "../../../components/organisms/FeedbackAlert";
import { useAuthStore } from "../../auth/stores/authStore";
import WeekNavigator from "../../dashboard/components/WeekNavigator";
import { formatWeekRange } from "../../dashboard/components/weeklySummary.utils";
import CategoryMixChart from "../components/charts/CategoryMixChart";
import ExpenseBreakdownChart from "../components/charts/ExpenseBreakdownChart";
import GalponComparisonChart from "../components/charts/GalponComparisonChart";
import PriceRangeChart from "../components/charts/PriceRangeChart";
import WeeklyTrendChart from "../components/charts/WeeklyTrendChart";
import ConsolidacionKpiCards from "../components/ConsolidacionKpiCards";
import GalponResultsTable from "../components/GalponResultsTable";
import GalponSheets from "../components/GalponSheets";
import GastoDialog from "../components/GastoDialog";
import GastosTable from "../components/GastosTable";
import SociosTable from "../components/SociosTable";
import { currentFriday, formatMoney, fridayOf } from "../components/consolidacion.utils";
import {
  cerrarSemana,
  createGasto,
  deleteGasto,
  getHistorial,
  getSemana,
  reabrirSemana,
} from "../services/consolidacionService";
import type { GastoPayload, GastoSemana, SemanaConsolidada, SemanaHistorial } from "../types/consolidacion.types";

type Confirmacion =
  | { tipo: "cerrar" }
  | { tipo: "reabrir" }
  | { tipo: "borrarGasto"; gasto: GastoSemana };

const dateTimeFormatter = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Bogota",
});

function confirmacionTexto(confirmacion: Confirmacion) {
  switch (confirmacion.tipo) {
    case "cerrar":
      return {
        titulo: "Cerrar la semana",
        texto: "Los ingresos, gastos y el reparto por socio quedan guardados tal como se ven y no cambian aunque después se modifiquen ventas, insumos o socios. No se podrán agregar ni borrar gastos de esta semana. Solo se puede deshacer reabriendo la semana, y la reapertura queda registrada.",
        boton: "Sí, cerrar semana",
      };
    case "reabrir":
      return {
        titulo: "Reabrir la semana",
        texto: "Se borrará el cierre guardado para poder corregir la semana. Quedará registrado quién lo reabrió.",
        boton: "Reabrir",
      };
    case "borrarGasto":
      return {
        titulo: "Borrar gasto",
        texto: `¿Borrar el gasto "${confirmacion.gasto.concepto}" por ${formatMoney(confirmacion.gasto.valor)}?`,
        boton: "Borrar",
      };
  }
}

/**
 * Cierre de la semana productiva (viernes a jueves): la hoja de cada galpón
 * como en el cuaderno, gráficas, reparto entre socios y gastos.
 */
export default function ConsolidacionPage() {
  const role = useAuthStore((state) => state.role);
  const permissions = useAuthStore((state) => state.permissions);
  const puedeCerrar = role === "Administrador" || permissions.includes("CERRAR_SEMANA");
  const puedeGastar = role === "Administrador" || permissions.includes("INGRESAR_GASTO");

  const [desde, setDesde] = useState(currentFriday);
  const [tab, setTab] = useState(0);
  const [data, setData] = useState<SemanaConsolidada | null>(null);
  const [historial, setHistorial] = useState<SemanaHistorial[]>([]);
  const [historialLoading, setHistorialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [gastoOpen, setGastoOpen] = useState(false);
  const [confirmacion, setConfirmacion] = useState<Confirmacion | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [confirmError, setConfirmError] = useState("");

  const load = useCallback(async (fecha: string) => {
    setIsLoading(true);
    setError(null);
    try {
      setData(await getSemana(fecha));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar la semana");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // El historial es secundario: si falla, la gráfica queda vacía sin bloquear la página.
  const loadHistorial = useCallback(async (fecha: string) => {
    setHistorialLoading(true);
    try {
      setHistorial(await getHistorial(fecha));
    } catch {
      setHistorial([]);
    } finally {
      setHistorialLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(desde);
    void loadHistorial(desde);
  }, [desde, load, loadHistorial]);

  const guardarGasto = async (payload: GastoPayload) => {
    await createGasto(payload);
    await load(desde);
    void loadHistorial(desde);
  };

  const cerrarConfirmacion = () => {
    if (confirmando) return;
    setConfirmacion(null);
    setConfirmError("");
  };

  const confirmar = async () => {
    if (!confirmacion) return;
    setConfirmando(true);
    setConfirmError("");
    try {
      if (confirmacion.tipo === "cerrar") setData(await cerrarSemana(desde));
      else if (confirmacion.tipo === "reabrir") setData(await reabrirSemana(desde));
      else {
        await deleteGasto(confirmacion.gasto.id);
        await load(desde);
      }
      void loadHistorial(desde);
      setConfirmacion(null);
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : "No se pudo completar la acción.");
    } finally {
      setConfirmando(false);
    }
  };

  const cerrada = data?.estado === "cerrada";
  const loadingSx = { opacity: isLoading ? 0.5 : 1, transition: "opacity 150ms" };
  const confirmacionInfo = confirmacion ? confirmacionTexto(confirmacion) : null;
  const resumenCierre = data
    ? [
        { label: "Ingresos", value: data.totales.ingresos },
        { label: "Insumos", value: data.totales.insumos },
        { label: "Gastos", value: data.totales.gastos },
        { label: "A repartir", value: data.totales.repartido },
        { label: "Deuda de galpones", value: data.totales.deudaFinal },
      ]
    : [];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: { xs: "stretch", md: "flex-end" },
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1, mb: 0.5 }}>
            <Typography variant="h4" sx={{ fontSize: { xs: "1.7rem", sm: "2rem" } }}>
              Cierre semanal
            </Typography>
            {data && (
              <Chip
                size="small"
                icon={cerrada ? <LockRoundedIcon /> : <LockOpenRoundedIcon />}
                label={cerrada ? "Cerrada" : "Abierta"}
                color={cerrada ? "success" : "default"}
                variant={cerrada ? "filled" : "outlined"}
              />
            )}
          </Box>
          <Typography color="text.secondary">
            {data ? formatWeekRange(data.desde, data.hasta) : "Semana de viernes a jueves."}
          </Typography>
          {cerrada && data?.cerradoEn && (
            <Typography variant="body2" color="text.secondary">
              Cerrada por {data.cerradoPor} el {dateTimeFormatter.format(new Date(data.cerradoEn))}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "stretch", sm: "center" },
            gap: 1,
          }}
        >
          <WeekNavigator value={desde} onChange={(fecha) => setDesde(fridayOf(fecha))} disabled={isLoading} />
          {puedeCerrar && data && (cerrada ? (
            <Button
              variant="outlined"
              startIcon={<LockOpenRoundedIcon />}
              onClick={() => setConfirmacion({ tipo: "reabrir" })}
              disabled={isLoading}
            >
              Reabrir
            </Button>
          ) : (
            <Button
              variant="contained"
              startIcon={<LockRoundedIcon />}
              onClick={() => setConfirmacion({ tipo: "cerrar" })}
              disabled={isLoading || !data.puedeCerrar}
            >
              Cerrar semana
            </Button>
          ))}
        </Box>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      {!data && isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress color="primary" />
        </Box>
      ) : data && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0, ...loadingSx }}>
          {data.bloqueos.length > 0 && (
            <Alert severity="warning">
              <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Falta para poder cerrar la semana</Typography>
              <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                {data.bloqueos.map((bloqueo) => <li key={bloqueo}>{bloqueo}</li>)}
              </Box>
            </Alert>
          )}
          {data.advertencias.length > 0 && (
            <Alert severity="info">
              <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                {data.advertencias.map((advertencia) => <li key={advertencia}>{advertencia}</li>)}
              </Box>
            </Alert>
          )}

          <ConsolidacionKpiCards data={data} />

          <Box sx={{ minWidth: 0 }}>
            <ModuleTabs
              value={tab}
              onChange={setTab}
              tabs={[
                { label: "Hoja del cuaderno", icon: <MenuBookRoundedIcon sx={{ fontSize: 18 }} /> },
                { label: "Gráficas", icon: <InsightsRoundedIcon sx={{ fontSize: 18 }} /> },
                { label: "Reparto", icon: <GroupsRoundedIcon sx={{ fontSize: 18 }} /> },
                { label: "Gastos", icon: <ReceiptLongRoundedIcon sx={{ fontSize: 18 }} /> },
              ]}
            />

            {tab === 0 && <GalponSheets galpones={data.galpones} />}

            {tab === 1 && (
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
                <Box sx={{ gridColumn: { lg: "1 / -1" } }}>
                  <WeeklyTrendChart semanas={historial} desde={data.desde} loading={historialLoading} />
                </Box>
                <GalponComparisonChart galpones={data.galpones} />
                <CategoryMixChart galpones={data.galpones} />
                <ExpenseBreakdownChart data={data} />
                <PriceRangeChart galpones={data.galpones} />
              </Box>
            )}

            {tab === 2 && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <GalponResultsTable galpones={data.galpones} />
                <SociosTable socios={data.socios} />
              </Box>
            )}

            {tab === 3 && (
              <GastosTable
                gastos={data.gastos}
                editable={puedeGastar && !cerrada}
                onAdd={() => setGastoOpen(true)}
                onDelete={(gasto) => setConfirmacion({ tipo: "borrarGasto", gasto })}
              />
            )}
          </Box>
        </Box>
      )}

      {gastoOpen && data && (
        <GastoDialog
          desde={data.desde}
          hasta={data.hasta}
          galpones={data.galpones.map(({ id, nombre }) => ({ id, nombre }))}
          onClose={() => setGastoOpen(false)}
          onSave={guardarGasto}
        />
      )}

      {confirmacion && confirmacionInfo && (
        <Dialog open onClose={cerrarConfirmacion} fullWidth maxWidth="xs">
          <DialogTitle sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1.5 }}>
            {confirmacion.tipo === "cerrar" && (
              <Box sx={{ p: 0.8, borderRadius: 1, bgcolor: "warning.light", color: "warning.dark", display: "flex" }}>
                <WarningAmberRoundedIcon />
              </Box>
            )}
            {confirmacionInfo.titulo}
          </DialogTitle>
          <DialogContent>
            {confirmacion.tipo === "cerrar" && data ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Alert severity="warning">
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>Esta acción guarda la semana como definitiva.</Typography>
                  <Typography variant="body2">{confirmacionInfo.texto}</Typography>
                </Alert>
                <Alert severity="info" icon={false}>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>{formatWeekRange(data.desde, data.hasta)}</Typography>
                  {resumenCierre.map((total) => (
                    <Box key={total.label} sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                      <Typography variant="body2">{total.label}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatMoney(total.value)}</Typography>
                    </Box>
                  ))}
                </Alert>
              </Box>
            ) : (
              <Typography>{confirmacionInfo.texto}</Typography>
            )}
            {confirmError && <FeedbackAlert severity="error" sx={{ mt: 2 }}>{confirmError}</FeedbackAlert>}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={cerrarConfirmacion} disabled={confirmando}>Cancelar</Button>
            <Button
              variant="contained"
              color={confirmacion.tipo === "borrarGasto" ? "error" : confirmacion.tipo === "cerrar" ? "warning" : "primary"}
              onClick={() => void confirmar()}
              disabled={confirmando}
            >
              {confirmando ? "Procesando…" : confirmacionInfo.boton}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}
