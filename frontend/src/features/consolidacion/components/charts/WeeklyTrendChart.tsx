import { useState } from "react";
import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import EntitySelect from "../../../../components/molecules/EntitySelect";
import { designTokens } from "../../../../theme/tokens";
import type { SemanaHistorial } from "../../types/consolidacion.types";
import { formatCompactMoney, formatMoney } from "../consolidacion.utils";
import ChartCard, { LegendItem } from "./ChartCard";

const TODA_LA_GRANJA = 0;
const CHART_HEIGHT = 160;
const INGRESOS = designTokens.color.success.main;
const EGRESOS = designTokens.color.secondary.main;

const shortDate = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", timeZone: "UTC" });
const formatShort = (isoDay: string) => shortDate.format(new Date(`${isoDay}T00:00:00.000Z`)).replace(".", "");

type Props = {
  semanas: SemanaHistorial[];
  /** Semana elegida en la página; se resalta. */
  desde: string;
  loading: boolean;
};

/** Ingresos, egresos y resultado de las últimas semanas, de la granja o de un galpón. */
export default function WeeklyTrendChart({ semanas, desde, loading }: Props) {
  const [galponId, setGalponId] = useState(TODA_LA_GRANJA);
  const galpones = new Map<number, string>();
  for (const semana of semanas) for (const galpon of semana.galpones) galpones.set(galpon.id, galpon.nombre);

  const puntos = semanas.map((semana) => {
    const galpon = semana.galpones.find((item) => item.id === galponId);
    const valores = galponId === TODA_LA_GRANJA ? semana : galpon ?? { ingresos: 0, egresos: 0, resultado: 0 };
    return { ...semana, ingresos: valores.ingresos, egresos: valores.egresos, resultado: valores.resultado };
  });
  const maximo = Math.max(1, ...puntos.flatMap((punto) => [punto.ingresos, punto.egresos]));
  const conDatos = puntos.filter((punto) => punto.ingresos !== 0 || punto.egresos !== 0);
  const nombre = galponId === TODA_LA_GRANJA ? "la granja" : galpones.get(galponId) ?? "el galpón";

  return (
    <ChartCard
      title="Últimas semanas"
      description="Ingresos frente a insumos y gastos de cada semana. Sirve para ver si el resultado mejora o empeora."
      ariaLabel={`Resultado semanal de ${nombre}: ${puntos.map((punto) => `semana del ${punto.desde}, ${formatMoney(punto.resultado)}`).join("; ")}`}
      actions={
        <Box sx={{ width: { xs: "100%", sm: 220 } }}>
          <EntitySelect
            value={galponId}
            placeholder="Toda la granja"
            ariaLabel="Galpón de la gráfica"
            options={[
              { value: TODA_LA_GRANJA, label: "Toda la granja" },
              ...[...galpones.entries()].map(([value, label]) => ({ value, label })),
            ]}
            onChange={setGalponId}
          />
        </Box>
      }
    >
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 2 }}>
        <LegendItem color={INGRESOS} label="Ingresos" />
        <LegendItem color={EGRESOS} label="Insumos y gastos" />
        <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "block", sm: "none" }, width: "100%" }}>
          Toca una semana para ver sus montos.
        </Typography>
      </Box>

      {conDatos.length === 0 && !loading ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 6, textAlign: "center" }}>
          No hay ventas ni gastos en estas semanas.
        </Typography>
      ) : (
        <Box sx={{ display: "flex", alignItems: "flex-end", gap: { xs: 0.5, sm: 1 }, opacity: loading ? 0.5 : 1 }}>
          {puntos.map((punto) => {
            const actual = punto.desde === desde;
            return (
              <Tooltip
                key={punto.desde}
                // En pantallas táctiles el detalle se abre con un toque.
                enterTouchDelay={0}
                leaveTouchDelay={4000}
                title={
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 800, display: "block" }}>
                      {formatShort(punto.desde)} – {formatShort(punto.hasta)} {punto.estado === "cerrada" ? "(cerrada)" : "(abierta)"}
                    </Typography>
                    <Typography variant="caption" sx={{ display: "block" }}>Ingresos: {formatMoney(punto.ingresos)}</Typography>
                    <Typography variant="caption" sx={{ display: "block" }}>Insumos y gastos: {formatMoney(punto.egresos)}</Typography>
                    <Typography variant="caption" sx={{ display: "block", fontWeight: 800 }}>Resultado: {formatMoney(punto.resultado)}</Typography>
                  </Box>
                }
              >
                <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
                  {/* En celular no caben los montos de todas las semanas: se ven al tocar la barra. */}
                  <Typography
                    variant="caption"
                    sx={{
                      display: { xs: "none", sm: "block" },
                      minHeight: "1.2em",
                      fontWeight: 800,
                      fontSize: "0.7rem",
                      color: punto.resultado < 0 ? "error.main" : "text.primary",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {punto.ingresos === 0 && punto.egresos === 0 ? "" : formatCompactMoney(punto.resultado)}
                  </Typography>
                  <Box
                    sx={{
                      width: "100%",
                      height: CHART_HEIGHT,
                      display: "flex",
                      alignItems: "flex-end",
                      justifyContent: "center",
                      gap: "2px",
                      px: { xs: 0.25, sm: 0.75 },
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      borderRadius: "6px 6px 0 0",
                      bgcolor: actual ? "background.default" : "transparent",
                    }}
                  >
                    {[
                      { valor: punto.ingresos, color: INGRESOS },
                      { valor: punto.egresos, color: EGRESOS },
                    ].map((barra, index) => (
                      <Box
                        key={index}
                        sx={{
                          flex: 1,
                          maxWidth: 22,
                          height: `${(Math.max(barra.valor, 0) / maximo) * 100}%`,
                          minHeight: barra.valor > 0 ? 2 : 0,
                          bgcolor: barra.color,
                          borderRadius: "4px 4px 0 0",
                          transition: "height 200ms ease",
                        }}
                      />
                    ))}
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                    {punto.estado === "cerrada" && <LockRoundedIcon sx={{ fontSize: 11, color: "success.main" }} />}
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: { xs: "0.625rem", sm: "0.7rem" },
                        fontWeight: actual ? 800 : 600,
                        color: actual ? "text.primary" : "text.secondary",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatShort(punto.desde)}
                    </Typography>
                  </Box>
                </Box>
              </Tooltip>
            );
          })}
        </Box>
      )}
    </ChartCard>
  );
}
