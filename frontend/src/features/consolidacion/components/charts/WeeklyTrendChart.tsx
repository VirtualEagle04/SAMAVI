import { useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import EntitySelect from "../../../../components/molecules/EntitySelect";
import { designTokens } from "../../../../theme/tokens";
import type { SemanaHistorial } from "../../types/consolidacion.types";
import { formatCompactMoney, formatMoney, signedColor } from "../consolidacion.utils";
import ChartCard, { LegendItem } from "./ChartCard";

const TODA_LA_GRANJA = 0;
const CHART_HEIGHT = { xs: 180, sm: 220 };
const AXIS_WIDTH = { xs: 44, sm: 56 };
const INGRESOS = designTokens.color.chart.ingresos;
const EGRESOS = designTokens.color.chart.egresos;
const RESULTADO = designTokens.color.text.primary;
const SURFACE = designTokens.color.background.paper;

const shortDate = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", timeZone: "UTC" });
const formatShort = (isoDay: string) => shortDate.format(new Date(`${isoDay}T00:00:00.000Z`)).replace(".", "");

/** Paso "redondo" (1, 2, 2,5 o 5 por potencia de 10) para las marcas del eje. */
function niceStep(raw: number): number {
  const power = 10 ** Math.floor(Math.log10(raw));
  const fraction = raw / power;
  const multiple = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return multiple * power;
}

/** Escala del eje Y: incluye el cero y los resultados negativos. */
function buildScale(values: number[]) {
  const max = Math.max(0, ...values);
  const min = Math.min(0, ...values);
  const step = niceStep((max - min) / 4 || 1);
  const top = Math.max(step, Math.ceil(max / step) * step);
  const bottom = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let tick = bottom; tick <= top + step / 2; tick += step) ticks.push(tick);
  // Posición en % desde arriba.
  const y = (value: number) => ((top - value) / (top - bottom)) * 100;
  const size = (value: number) => (Math.max(value, 0) / (top - bottom)) * 100;
  return { ticks, y, size };
}

function LineKey() {
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
      <Box sx={{ position: "relative", width: 18, height: 10, display: "flex", alignItems: "center" }}>
        <Box sx={{ width: "100%", height: 2, bgcolor: RESULTADO, borderRadius: 1 }} />
        <Box sx={{ position: "absolute", left: "50%", top: "50%", width: 8, height: 8, borderRadius: "50%", bgcolor: RESULTADO, transform: "translate(-50%, -50%)" }} />
      </Box>
      <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
        Resultado
      </Typography>
    </Box>
  );
}

function Figure({ label, value, swatch }: { label: string; value: number; swatch: ReactNode }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
        {swatch}
        <Typography variant="caption" color="text.secondary" noWrap>
          {label}
        </Typography>
      </Box>
      <Typography sx={{ fontWeight: 800, fontSize: { xs: "0.95rem", sm: "1.05rem" }, color: label === "Resultado" ? signedColor(value) : "text.primary" }} noWrap>
        {formatMoney(value)}
      </Typography>
    </Box>
  );
}

const swatch = (color: string) => <Box sx={{ width: 10, height: 10, borderRadius: "3px", bgcolor: color, flexShrink: 0 }} />;

type Props = {
  semanas: SemanaHistorial[];
  /** Semana elegida en la página; se resalta. */
  desde: string;
  loading: boolean;
};

/** Ingresos, egresos y resultado de las últimas semanas, de la granja o de un galpón. */
export default function WeeklyTrendChart({ semanas, desde, loading }: Props) {
  const [galponId, setGalponId] = useState(TODA_LA_GRANJA);
  // Semana marcada con el cursor, el teclado o un toque; sin señalar, la de la página.
  const [marcada, setMarcada] = useState<string | null>(null);
  const galpones = new Map<number, string>();
  for (const semana of semanas) for (const galpon of semana.galpones) galpones.set(galpon.id, galpon.nombre);

  const puntos = semanas.map((semana) => {
    const galpon = semana.galpones.find((item) => item.id === galponId);
    const valores = galponId === TODA_LA_GRANJA ? semana : galpon ?? { ingresos: 0, egresos: 0, resultado: 0 };
    return { ...semana, ingresos: valores.ingresos, egresos: valores.egresos, resultado: valores.resultado };
  });
  const conDatos = puntos.filter((punto) => punto.ingresos !== 0 || punto.egresos !== 0);
  const nombre = galponId === TODA_LA_GRANJA ? "la granja" : galpones.get(galponId) ?? "el galpón";
  const scale = buildScale(puntos.flatMap((punto) => [punto.ingresos, punto.egresos, punto.resultado]));
  const activa = puntos.find((punto) => punto.desde === (marcada ?? desde)) ?? puntos[puntos.length - 1];
  const n = puntos.length;
  const xOf = (index: number) => ((index + 0.5) / n) * 100;

  return (
    <ChartCard
      title="Últimas semanas"
      interactive
      description="Ingresos frente a insumos y gastos de cada semana, y el resultado que queda. Sirve para ver si mejora o empeora."
      ariaLabel={`Resultado semanal de ${nombre}: ${puntos.map((punto) => `semana del ${punto.desde}, ingresos ${formatMoney(punto.ingresos)}, insumos y gastos ${formatMoney(punto.egresos)}, resultado ${formatMoney(punto.resultado)}`).join("; ")}`}
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
        <LineKey />
      </Box>

      {conDatos.length === 0 && !loading ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 6, textAlign: "center" }}>
          No hay ventas ni gastos en estas semanas.
        </Typography>
      ) : (
        <Box sx={{ opacity: loading ? 0.5 : 1, transition: "opacity 150ms" }}>
          <Box sx={{ display: "flex" }}>
            {/* Eje Y */}
            <Box sx={{ position: "relative", width: AXIS_WIDTH, flexShrink: 0, height: CHART_HEIGHT }} aria-hidden>
              {scale.ticks.map((tick) => (
                <Typography
                  key={tick}
                  variant="caption"
                  sx={{
                    position: "absolute",
                    right: 6,
                    top: `${scale.y(tick)}%`,
                    transform: "translateY(-50%)",
                    fontSize: { xs: "0.625rem", sm: "0.7rem" },
                    color: "text.secondary",
                    fontVariantNumeric: "tabular-nums",
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatCompactMoney(tick)}
                </Typography>
              ))}
            </Box>

            {/* Área de la gráfica */}
            <Box sx={{ position: "relative", flex: 1, minWidth: 0, height: CHART_HEIGHT }} onMouseLeave={() => setMarcada(null)}>
              {scale.ticks.map((tick) => (
                <Box
                  key={tick}
                  aria-hidden
                  sx={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: `${scale.y(tick)}%`,
                    height: "1px",
                    bgcolor: tick === 0 ? "text.disabled" : "divider",
                  }}
                />
              ))}

              <Box sx={{ position: "absolute", inset: 0, display: "flex" }}>
                {puntos.map((punto) => {
                  const esActiva = punto.desde === activa?.desde;
                  return (
                    <ButtonBase
                      key={punto.desde}
                      onMouseEnter={() => setMarcada(punto.desde)}
                      onFocus={() => setMarcada(punto.desde)}
                      onClick={() => setMarcada(punto.desde)}
                      aria-label={`Semana del ${formatShort(punto.desde)}: ingresos ${formatMoney(punto.ingresos)}, insumos y gastos ${formatMoney(punto.egresos)}, resultado ${formatMoney(punto.resultado)}`}
                      aria-pressed={esActiva}
                      sx={{
                        position: "relative",
                        flex: 1,
                        minWidth: 0,
                        height: "100%",
                        borderRadius: "6px 6px 0 0",
                        bgcolor: esActiva ? "rgba(92, 67, 51, 0.06)" : "transparent",
                        transition: "background-color 120ms",
                      }}
                    >
                      <Box
                        sx={{
                          position: "absolute",
                          left: 0,
                          right: 0,
                          bottom: `${100 - scale.y(0)}%`,
                          height: "100%",
                          display: "flex",
                          alignItems: "flex-end",
                          justifyContent: "center",
                          gap: "2px",
                          pointerEvents: "none",
                        }}
                      >
                        {[
                          { valor: punto.ingresos, color: INGRESOS },
                          { valor: punto.egresos, color: EGRESOS },
                        ].map((barra, index) => (
                          <Box
                            key={index}
                            sx={{
                              width: { xs: "34%", sm: "30%" },
                              maxWidth: 20,
                              height: `${scale.size(barra.valor)}%`,
                              minHeight: barra.valor > 0 ? 2 : 0,
                              bgcolor: barra.color,
                              borderRadius: "4px 4px 0 0",
                              transition: "height 200ms ease",
                            }}
                          />
                        ))}
                      </Box>
                    </ButtonBase>
                  );
                })}
              </Box>

              {/* Línea del resultado: sobre las barras, sin capturar el cursor. */}
              <Box
                component="svg"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden
                sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: "none" }}
              >
                <polyline
                  points={puntos.map((punto, index) => `${xOf(index)},${scale.y(punto.resultado)}`).join(" ")}
                  fill="none"
                  stroke={RESULTADO}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </Box>
              {puntos.map((punto, index) => {
                const esActiva = punto.desde === activa?.desde;
                return (
                  <Box
                    key={punto.desde}
                    aria-hidden
                    sx={{
                      position: "absolute",
                      left: `${xOf(index)}%`,
                      top: `${scale.y(punto.resultado)}%`,
                      width: esActiva ? 12 : 8,
                      height: esActiva ? 12 : 8,
                      borderRadius: "50%",
                      bgcolor: RESULTADO,
                      boxShadow: `0 0 0 2px ${SURFACE}`,
                      transform: "translate(-50%, -50%)",
                      pointerEvents: "none",
                      transition: "width 120ms, height 120ms",
                    }}
                  />
                );
              })}
            </Box>
          </Box>

          {/* Eje X */}
          <Box sx={{ display: "flex", ml: AXIS_WIDTH, mt: 0.75 }} aria-hidden>
            {puntos.map((punto) => {
              const esActiva = punto.desde === activa?.desde;
              return (
                <Box key={punto.desde} sx={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 0.25 }}>
                  {punto.estado === "cerrada" && <LockRoundedIcon sx={{ fontSize: 11, color: "text.secondary", display: { xs: "none", sm: "block" } }} />}
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: { xs: "0.625rem", sm: "0.7rem" },
                      fontWeight: esActiva ? 800 : 600,
                      color: esActiva ? "text.primary" : "text.secondary",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatShort(punto.desde)}
                  </Typography>
                </Box>
              );
            })}
          </Box>

          {/* Detalle de la semana señalada: hace de tooltip en escritorio y en celular. */}
          {activa && (
            <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: "background.default", border: "1px solid", borderColor: "divider" }} aria-live="polite">
              <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1, mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                  Semana del {formatShort(activa.desde)} al {formatShort(activa.hasta)}
                </Typography>
                <Chip
                  size="small"
                  variant="outlined"
                  icon={activa.estado === "cerrada" ? <LockRoundedIcon sx={{ fontSize: 14 }} /> : undefined}
                  label={activa.estado === "cerrada" ? "Cerrada" : "Abierta"}
                />
                <Typography variant="caption" color="text.secondary" sx={{ ml: "auto", display: { xs: "block", sm: "none" } }}>
                  Toca otra semana para compararla
                </Typography>
              </Box>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 1fr))" }, gap: 1.5 }}>
                <Figure label="Ingresos" value={activa.ingresos} swatch={swatch(INGRESOS)} />
                <Figure label="Insumos y gastos" value={activa.egresos} swatch={swatch(EGRESOS)} />
                <Figure
                  label="Resultado"
                  value={activa.resultado}
                  swatch={<Box sx={{ width: 10, height: 2, bgcolor: RESULTADO, borderRadius: 1, flexShrink: 0 }} />}
                />
              </Box>
            </Box>
          )}
        </Box>
      )}
    </ChartCard>
  );
}
