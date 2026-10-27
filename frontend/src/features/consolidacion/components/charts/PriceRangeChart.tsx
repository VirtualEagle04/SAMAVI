import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import CategoryBadge, { CATEGORY_COLORS } from "../../../../components/atoms/CategoryBadge";
import type { ResultadoGalpon } from "../../types/consolidacion.types";
import { formatMoney } from "../consolidacion.utils";
import ChartCard from "./ChartCard";

const FALLBACK_COLOR = "#9A8E80";
const ORDEN = Object.keys(CATEGORY_COLORS);
const posicion = (codigo: string) => (ORDEN.includes(codigo) ? ORDEN.indexOf(codigo) : ORDEN.length);

type Rango = { categoria: string; minimo: number; maximo: number; promedio: number; bandejas: number };

/** Precio más bajo, más alto y promedio por bandeja de cada categoría en la semana. */
export default function PriceRangeChart({ galpones }: { galpones: ResultadoGalpon[] }) {
  const acumulado = new Map<string, Rango & { valor: number }>();
  for (const galpon of galpones) {
    for (const linea of galpon.ventas) {
      const actual = acumulado.get(linea.categoria) ?? {
        categoria: linea.categoria,
        minimo: linea.precio,
        maximo: linea.precio,
        promedio: 0,
        bandejas: 0,
        valor: 0,
      };
      actual.minimo = Math.min(actual.minimo, linea.precio);
      actual.maximo = Math.max(actual.maximo, linea.precio);
      actual.bandejas += linea.bandejas;
      actual.valor += linea.valor;
      acumulado.set(linea.categoria, actual);
    }
  }
  const rangos: Rango[] = [...acumulado.values()]
    .filter((rango) => rango.bandejas > 0)
    .map(({ valor, ...rango }) => ({ ...rango, promedio: valor / rango.bandejas }))
    .sort((a, b) => posicion(a.categoria) - posicion(b.categoria));

  const piso = Math.min(...rangos.map((rango) => rango.minimo));
  const techo = Math.max(...rangos.map((rango) => rango.maximo));
  const ancho = Math.max(techo - piso, 1);
  const x = (precio: number) => ((precio - piso) / ancho) * 100;

  return (
    <ChartCard
      title="Precio por bandeja"
      description="Precio más bajo, más alto y promedio de cada categoría. Un rango amplio indica clientes que pagan muy distinto por el mismo huevo."
      ariaLabel={rangos
        .map((rango) => `${rango.categoria}: de ${formatMoney(rango.minimo)} a ${formatMoney(rango.maximo)}, promedio ${formatMoney(Math.round(rango.promedio))}`)
        .join("; ")}
    >
      {rangos.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
          No hay ventas en la semana.
        </Typography>
      ) : (
        <Box sx={{ display: "grid", gap: 1.5 }}>
          {rangos.map((rango) => {
            const color = CATEGORY_COLORS[rango.categoria]?.border ?? FALLBACK_COLOR;
            return (
              <Box
                key={rango.categoria}
                sx={{ display: "grid", gridTemplateColumns: "44px minmax(0, 1fr)", alignItems: "center", gap: 1.5 }}
              >
                <CategoryBadge codigo={rango.categoria} />
                <Box>
                  <Tooltip
                    enterTouchDelay={0}
                    title={`${rango.bandejas.toLocaleString("es-CO")} bandejas · promedio ${formatMoney(Math.round(rango.promedio))}`}
                  >
                    <Box sx={{ position: "relative", height: 14, borderRadius: 1, bgcolor: "background.default" }}>
                      <Box
                        sx={{
                          position: "absolute",
                          top: 3,
                          bottom: 3,
                          left: `${x(rango.minimo)}%`,
                          width: `${Math.max(x(rango.maximo) - x(rango.minimo), 1.5)}%`,
                          bgcolor: color,
                          opacity: 0.45,
                          borderRadius: 1,
                        }}
                      />
                      <Box
                        sx={{
                          position: "absolute",
                          top: 0,
                          left: `calc(${x(rango.promedio)}% - 7px)`,
                          width: 14,
                          height: 14,
                          borderRadius: "50%",
                          bgcolor: color,
                          border: "2px solid",
                          borderColor: "background.paper",
                          boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.12)",
                        }}
                      />
                    </Box>
                  </Tooltip>
                  <Box sx={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", columnGap: 1, mt: 0.4 }}>
                    <Typography variant="caption" color="text.secondary">
                      {rango.minimo === rango.maximo
                        ? formatMoney(rango.minimo)
                        : `${formatMoney(rango.minimo)} – ${formatMoney(rango.maximo)}`}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 800 }}>
                      Prom. {formatMoney(Math.round(rango.promedio))}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </ChartCard>
  );
}
