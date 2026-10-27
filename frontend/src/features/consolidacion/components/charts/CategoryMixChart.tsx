import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { CATEGORY_COLORS } from "../../../../components/atoms/CategoryBadge";
import type { ResultadoGalpon } from "../../types/consolidacion.types";
import { formatMoney } from "../consolidacion.utils";
import ChartCard, { LegendItem } from "./ChartCard";

const FALLBACK_COLOR = "#9A8E80";
const colorOf = (codigo: string) => CATEGORY_COLORS[codigo]?.border ?? FALLBACK_COLOR;
// Orden del cuaderno (Y, Ex, AA, A, B, C, P, Q); una categoría desconocida va al final.
const ORDEN = Object.keys(CATEGORY_COLORS);
const posicion = (codigo: string) => (ORDEN.includes(codigo) ? ORDEN.indexOf(codigo) : ORDEN.length);

type Fila = { id: number | "granja"; nombre: string; total: number; partes: Array<{ categoria: string; valor: number }> };

/** Parte de los ingresos de cada galpón que viene de cada categoría. */
export default function CategoryMixChart({ galpones }: { galpones: ResultadoGalpon[] }) {
  const porGalpon: Fila[] = galpones.map((galpon) => {
    const valores = new Map<string, number>();
    for (const linea of galpon.ventas) {
      valores.set(linea.categoria, (valores.get(linea.categoria) ?? 0) + linea.valor);
    }
    return {
      id: galpon.id,
      nombre: galpon.nombre,
      total: galpon.ingresos,
      partes: [...valores.entries()].map(([categoria, valor]) => ({ categoria, valor })),
    };
  });
  const granja = new Map<string, number>();
  for (const fila of porGalpon) for (const parte of fila.partes) granja.set(parte.categoria, (granja.get(parte.categoria) ?? 0) + parte.valor);
  const totalGranja: Fila = {
    id: "granja",
    nombre: "Toda la granja",
    total: [...granja.values()].reduce((suma, valor) => suma + valor, 0),
    partes: [...granja.entries()].map(([categoria, valor]) => ({ categoria, valor })),
  };
  const filas: Fila[] = [totalGranja, ...porGalpon]
    .filter((fila) => fila.total > 0)
    .map((fila) => ({ ...fila, partes: [...fila.partes].sort((a, b) => posicion(a.categoria) - posicion(b.categoria)) }));
  const orden = [...granja.keys()].sort((a, b) => posicion(a) - posicion(b));

  return (
    <ChartCard
      title="Ingresos por categoría"
      description="De qué categorías sale el dinero de cada galpón."
      ariaLabel={filas
        .map((fila) => `${fila.nombre}: ${fila.partes.map((parte) => `${parte.categoria} ${Math.round((parte.valor / fila.total) * 100)} %`).join(", ")}`)
        .join("; ")}
    >
      {filas.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
          No hay ventas en la semana.
        </Typography>
      ) : (
        <>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mb: 2 }}>
            {orden.map((codigo) => <LegendItem key={codigo} color={colorOf(codigo)} label={codigo} />)}
          </Box>
          <Box sx={{ display: "grid", gap: 1.75 }}>
            {filas.map((fila) => (
              <Box key={fila.id}>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, mb: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: fila.id === "granja" ? 900 : 800 }}>{fila.nombre}</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", whiteSpace: "nowrap" }}>
                    {formatMoney(fila.total)}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", height: 18, borderRadius: 1, overflow: "hidden", bgcolor: "background.default" }}>
                  {fila.partes.map((parte) => {
                    const porcentaje = (parte.valor / fila.total) * 100;
                    return (
                      <Tooltip
                        key={parte.categoria}
                        enterTouchDelay={0}
                        title={`${parte.categoria}: ${formatMoney(parte.valor)} (${porcentaje.toFixed(1).replace(".", ",")} %)`}
                      >
                        <Box
                          sx={{
                            width: `${porcentaje}%`,
                            bgcolor: colorOf(parte.categoria),
                            borderRight: "1px solid",
                            borderColor: "background.paper",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "hidden",
                          }}
                        >
                          {porcentaje >= 9 && (
                            <Typography sx={{ fontSize: "0.625rem", fontWeight: 800, color: "#FFFFFF", whiteSpace: "nowrap" }}>
                              {Math.round(porcentaje)}%
                            </Typography>
                          )}
                        </Box>
                      </Tooltip>
                    );
                  })}
                </Box>
              </Box>
            ))}
          </Box>
        </>
      )}
    </ChartCard>
  );
}
