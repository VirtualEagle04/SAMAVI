import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { designTokens } from "../../../../theme/tokens";
import type { ResultadoGalpon } from "../../types/consolidacion.types";
import { formatMoney } from "../consolidacion.utils";
import ChartCard, { LegendItem } from "./ChartCard";

const INGRESOS = designTokens.color.success.main;
const EGRESOS = designTokens.color.secondary.main;

function Barra({ valor, maximo, color }: { valor: number; maximo: number; color: string }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", alignItems: "center", gap: 1 }}>
      <Box sx={{ height: 12, borderRadius: 1, bgcolor: "background.default", overflow: "hidden" }}>
        <Box
          sx={{
            width: `${(Math.max(valor, 0) / maximo) * 100}%`,
            height: "100%",
            bgcolor: color,
            borderRadius: 1,
            transition: "width 200ms ease",
          }}
        />
      </Box>
      <Typography variant="caption" sx={{ fontWeight: 700, whiteSpace: "nowrap", minWidth: { sm: 96 }, textAlign: "right" }}>
        {formatMoney(valor)}
      </Typography>
    </Box>
  );
}

/** Ingresos frente a insumos y gastos de cada galpón en la semana. */
export default function GalponComparisonChart({ galpones }: { galpones: ResultadoGalpon[] }) {
  const maximo = Math.max(1, ...galpones.flatMap((galpon) => [galpon.ingresos, galpon.insumos + galpon.gastos]));
  return (
    <ChartCard
      title="Resultado por galpón"
      description="Cuánto vendió cada galpón y cuánto le costó en la semana."
      ariaLabel={galpones
        .map((galpon) => `${galpon.nombre}: ingresos ${formatMoney(galpon.ingresos)}, gastos ${formatMoney(galpon.insumos + galpon.gastos)}, saldo ${formatMoney(galpon.resultado)}`)
        .join("; ")}
    >
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 2 }}>
        <LegendItem color={INGRESOS} label="Ingresos" />
        <LegendItem color={EGRESOS} label="Insumos y gastos" />
      </Box>
      <Box sx={{ display: "grid", gap: 2 }}>
        {galpones.map((galpon) => (
          <Box key={galpon.id}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 1, mb: 0.75 }}>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>{galpon.nombre}</Typography>
              <Typography
                variant="body2"
                sx={{ fontWeight: 800, color: galpon.resultado < 0 ? "error.main" : "success.main", whiteSpace: "nowrap" }}
              >
                Saldo {formatMoney(galpon.resultado)}
              </Typography>
            </Box>
            <Box sx={{ display: "grid", gap: 0.5 }}>
              <Barra valor={galpon.ingresos} maximo={maximo} color={INGRESOS} />
              <Barra valor={galpon.insumos + galpon.gastos} maximo={maximo} color={EGRESOS} />
            </Box>
          </Box>
        ))}
      </Box>
    </ChartCard>
  );
}
