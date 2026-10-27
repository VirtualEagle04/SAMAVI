import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import HomeWorkRoundedIcon from "@mui/icons-material/HomeWorkRounded";
import EmptyState from "../../../components/molecules/EmptyState";
import TableToolbar from "../../../components/molecules/TableToolbar";
import {
  tableCardSx,
  tableMobileCardSx,
  tableMobilePrimaryTextSx,
  tableSx,
} from "../../../components/tableStyles";
import type { ResultadoGalpon } from "../types/consolidacion.types";
import { formatMoney, signedColor } from "./consolidacion.utils";

type Props = { galpones: ResultadoGalpon[] };

const signedSx = (value: number) => ({ fontWeight: 700, color: signedColor(value) });

function MobileRow({ label, value, sx }: { label: string; value: number; sx?: object }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 700, whiteSpace: "nowrap", ...sx }}>{formatMoney(value)}</Typography>
    </Box>
  );
}

/** Ingresos, gastos, resultado y deuda de cada galpón en la semana. */
export default function GalponResultsTable({ galpones }: Props) {
  return (
    <Card elevation={0} variant="outlined" sx={tableCardSx}>
      <TableToolbar
        title="Resultado por galpón"
        description="Ingresos menos insumos y gastos. Si un galpón pierde, el déficit queda como deuda y se abona con sus ganancias siguientes."
      />
      {galpones.length === 0 ? (
        <EmptyState
          icon={<HomeWorkRoundedIcon />}
          title="Sin galpones en la semana"
          description="No hay galpones activos ni movimientos registrados para esta semana."
        />
      ) : (
        <>
          <Box
            sx={{
              display: { xs: "grid", lg: "none" },
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
              gap: 1,
              p: 1.5,
            }}
          >
            {galpones.map((galpon) => {
              const conDeuda = galpon.deudaAnterior > 0 || galpon.deudaFinal > 0;
              return (
                <Box key={galpon.id} sx={tableMobileCardSx}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 1, mb: 1 }}>
                    <Typography sx={tableMobilePrimaryTextSx}>{galpon.nombre}</Typography>
                    <Typography sx={{ ...tableMobilePrimaryTextSx, color: signedColor(galpon.resultado) }}>
                      {formatMoney(galpon.resultado)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "grid", gap: 0.5 }}>
                    <MobileRow label="Ingresos" value={galpon.ingresos} />
                    <MobileRow label="Insumos" value={galpon.insumos} />
                    <MobileRow label="Gastos" value={galpon.gastos} />
                    {conDeuda && <MobileRow label="Deuda anterior" value={galpon.deudaAnterior} />}
                    {conDeuda && <MobileRow label="Abono" value={galpon.abonoDeuda} />}
                    {conDeuda && <MobileRow label="Deuda final" value={galpon.deudaFinal} sx={{ color: galpon.deudaFinal > 0 ? "error.main" : "text.primary" }} />}
                    <Box sx={{ borderTop: "1px solid", borderColor: "divider", pt: 0.5, mt: 0.25 }}>
                      <MobileRow label="A repartir" value={galpon.repartible} sx={{ fontWeight: 800 }} />
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
          <TableContainer sx={{ display: { xs: "none", lg: "block" } }}>
            <Table sx={{ ...tableSx, minWidth: 0 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Galpón</TableCell>
                  <TableCell align="right">Ingresos</TableCell>
                  <TableCell align="right">Insumos</TableCell>
                  <TableCell align="right">Gastos</TableCell>
                  <TableCell align="right">Resultado</TableCell>
                  <TableCell align="right">Deuda anterior</TableCell>
                  <TableCell align="right">Abono</TableCell>
                  <TableCell align="right">Deuda final</TableCell>
                  <TableCell align="right">A repartir</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {galpones.map((galpon) => (
                  <TableRow key={galpon.id}>
                    <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>{galpon.nombre}</TableCell>
                    <TableCell align="right">
                      {formatMoney(galpon.ingresos)}
                      {galpon.ingresosProrrateados ? (
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                          {formatMoney(galpon.ingresosProrrateados)} prorrateado
                        </Typography>
                      ) : null}
                    </TableCell>
                    <TableCell align="right">{formatMoney(galpon.insumos)}</TableCell>
                    <TableCell align="right">{formatMoney(galpon.gastos)}</TableCell>
                    <TableCell align="right" sx={signedSx(galpon.resultado)}>{formatMoney(galpon.resultado)}</TableCell>
                    <TableCell align="right">{formatMoney(galpon.deudaAnterior)}</TableCell>
                    <TableCell align="right">{formatMoney(galpon.abonoDeuda)}</TableCell>
                    <TableCell align="right" sx={{ color: galpon.deudaFinal > 0 ? "error.main" : "text.primary" }}>
                      {formatMoney(galpon.deudaFinal)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>{formatMoney(galpon.repartible)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Card>
  );
}
