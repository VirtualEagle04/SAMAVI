import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { designTokens } from "../../../../theme/tokens";
import type { SemanaConsolidada } from "../../types/consolidacion.types";
import { formatMoney } from "../consolidacion.utils";
import ChartCard from "./ChartCard";

const MAXIMO_CONCEPTOS = 7;

type Concepto = { concepto: string; valor: number; insumo: boolean };

/** Gastos e insumos de la semana agrupados por concepto, de mayor a menor. */
export default function ExpenseBreakdownChart({ data }: { data: SemanaConsolidada }) {
  const conceptos = new Map<string, Concepto>();
  const sumar = (concepto: string, valor: number, insumo: boolean) => {
    const clave = `${insumo ? "insumo" : "gasto"}:${concepto.trim().toLowerCase()}`;
    const actual = conceptos.get(clave) ?? { concepto: concepto.trim(), valor: 0, insumo };
    actual.valor += valor;
    conceptos.set(clave, actual);
  };
  for (const gasto of data.gastos) sumar(gasto.concepto, gasto.valor, false);
  for (const galpon of data.galpones) for (const linea of galpon.insumosDetalle) sumar(linea.concepto, linea.valor, true);

  const ordenados = [...conceptos.values()].filter((item) => item.valor > 0).sort((a, b) => b.valor - a.valor);
  const visibles = ordenados.slice(0, MAXIMO_CONCEPTOS);
  const resto = ordenados.slice(MAXIMO_CONCEPTOS).reduce((suma, item) => suma + item.valor, 0);
  const filas: Concepto[] = resto > 0 ? [...visibles, { concepto: `Otros (${ordenados.length - MAXIMO_CONCEPTOS})`, valor: resto, insumo: false }] : visibles;
  const total = ordenados.reduce((suma, item) => suma + item.valor, 0);
  const maximo = Math.max(1, ...filas.map((fila) => fila.valor));

  return (
    <ChartCard
      title="¿En qué se va el dinero?"
      description="Insumos y gastos de la semana por concepto. El porcentaje es sobre el total de egresos."
      ariaLabel={filas.map((fila) => `${fila.concepto}: ${formatMoney(fila.valor)}`).join("; ")}
    >
      {filas.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
          No hay insumos ni gastos en la semana.
        </Typography>
      ) : (
        <Box sx={{ display: "grid", gap: 1.25 }}>
          {filas.map((fila) => (
            <Box key={`${fila.insumo}-${fila.concepto}`}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 1, mb: 0.4 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 0, overflowWrap: "anywhere" }}>
                  {fila.concepto}
                  {fila.insumo && (
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.75 }}>
                      Insumo
                    </Typography>
                  )}
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 800, whiteSpace: "nowrap" }}>
                  {formatMoney(fila.valor)}
                  <Box component="span" sx={{ color: "text.secondary", fontWeight: 600, ml: 0.75 }}>
                    {Math.round((fila.valor / total) * 100)} %
                  </Box>
                </Typography>
              </Box>
              <Box sx={{ height: 8, borderRadius: 1, bgcolor: "background.default", overflow: "hidden" }}>
                <Box
                  sx={{
                    width: `${(fila.valor / maximo) * 100}%`,
                    height: "100%",
                    borderRadius: 1,
                    bgcolor: fila.insumo ? designTokens.color.info.main : designTokens.color.secondary.main,
                  }}
                />
              </Box>
            </Box>
          ))}
          <Box sx={{ display: "flex", justifyContent: "space-between", pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
            <Typography variant="body2" sx={{ fontWeight: 800 }}>Total egresos</Typography>
            <Typography variant="body2" sx={{ fontWeight: 800 }}>{formatMoney(total)}</Typography>
          </Box>
        </Box>
      )}
    </ChartCard>
  );
}
