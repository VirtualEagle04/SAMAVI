import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import CategoryBadge from "../../../components/atoms/CategoryBadge";
import { tableCardSx } from "../../../components/tableStyles";
import { designTokens } from "../../../theme/tokens";
import type { ResultadoGalpon, VentaGalpon } from "../types/consolidacion.types";
import { formatCantidad, formatMoney, signedColor } from "./consolidacion.utils";

const sectionTitleSx = {
  fontWeight: 800,
  fontSize: "0.75rem",
  letterSpacing: "0.06em",
  color: "text.secondary",
  px: 2,
  pt: 2,
  pb: 1,
};

// Tabla compacta: cabe en un celular sin desplazamiento horizontal.
const sheetTableSx = {
  "& .MuiTableCell-root": { px: { xs: 0.75, sm: 1.25 }, py: 0.75, fontSize: "0.8125rem" },
  "& .MuiTableCell-head": { fontSize: "0.6875rem", fontWeight: 700, color: "text.secondary", letterSpacing: "0.04em" },
  "& .MuiChip-root": { height: 22 },
};

const totalRowSx = {
  bgcolor: "background.default",
  "& td": { fontWeight: 800, borderBottom: 0, borderTop: "2px solid", borderTopColor: "divider" },
};

const bodegaTint = alpha(designTokens.color.error.main, 0.06);

function VentasTable({ galpon }: { galpon: ResultadoGalpon }) {
  const porCategoria = new Map<string, VentaGalpon[]>();
  for (const linea of galpon.ventas) {
    porCategoria.set(linea.categoria, [...(porCategoria.get(linea.categoria) ?? []), linea]);
  }

  return (
    <Table size="small" sx={sheetTableSx}>
      <TableHead>
        <TableRow>
          <TableCell>PESO</TableCell>
          <TableCell align="right">BAND.</TableCell>
          <TableCell align="right">PRECIO</TableCell>
          <TableCell align="right">TOTAL</TableCell>
          <TableCell align="center">
            <Tooltip title="Restante en bodega después de las ventas">
              <span>BODEGA</span>
            </Tooltip>
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {galpon.bodega.map((categoria) => {
          const lineas = porCategoria.get(categoria.categoria) ?? [];
          const filas = Math.max(lineas.length, 1);
          const bodegaCell = (
            <TableCell
              rowSpan={filas}
              align="center"
              sx={{
                bgcolor: bodegaTint,
                fontWeight: 700,
                // En rojo, como la bodega del cuaderno.
                color: categoria.restante === 0 ? "text.secondary" : "error.main",
              }}
            >
              <Tooltip title={`${formatCantidad(categoria.disponible)} disponibles · ${formatCantidad(categoria.vendidas)} vendidas`}>
                <span>{categoria.restante === 0 ? "—" : formatCantidad(categoria.restante)}</span>
              </Tooltip>
            </TableCell>
          );
          const badgeCell = (
            <TableCell rowSpan={filas} sx={{ verticalAlign: "top" }}>
              <CategoryBadge codigo={categoria.categoria} />
            </TableCell>
          );

          if (lineas.length === 0) {
            return (
              <TableRow key={categoria.categoria}>
                {badgeCell}
                <TableCell align="right" sx={{ color: "text.secondary" }}>—</TableCell>
                <TableCell align="right" sx={{ color: "text.secondary" }}>—</TableCell>
                <TableCell align="right" sx={{ color: "text.secondary" }}>—</TableCell>
                {bodegaCell}
              </TableRow>
            );
          }
          return lineas.map((linea, index) => (
            <TableRow key={`${linea.categoria}-${linea.precio}`}>
              {index === 0 && badgeCell}
              <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCantidad(linea.bandejas)}</TableCell>
              <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>{formatMoney(linea.precio)}</TableCell>
              <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>{formatMoney(linea.valor)}</TableCell>
              {index === 0 && bodegaCell}
            </TableRow>
          ));
        })}
        <TableRow sx={totalRowSx}>
          <TableCell colSpan={3}>Total ventas</TableCell>
          <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>{formatMoney(galpon.ingresos)}</TableCell>
          <TableCell />
        </TableRow>
      </TableBody>
    </Table>
  );
}

function GastosList({ galpon }: { galpon: ResultadoGalpon }) {
  const sinGastos = galpon.insumosDetalle.length === 0 && galpon.gastosDetalle.length === 0;
  return (
    <Table size="small" sx={sheetTableSx}>
      <TableBody>
        {sinGastos && (
          <TableRow>
            <TableCell colSpan={2} sx={{ color: "text.secondary" }}>Sin insumos ni gastos en la semana.</TableCell>
          </TableRow>
        )}
        {galpon.insumosDetalle.map((linea) => (
          <TableRow key={`insumo-${linea.concepto}`}>
            <TableCell>
              {linea.concepto}
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                Insumo · {formatCantidad(linea.cantidad)} {linea.unidad}
              </Typography>
            </TableCell>
            <TableCell align="right" sx={{ whiteSpace: "nowrap", verticalAlign: "top" }}>{formatMoney(linea.valor)}</TableCell>
          </TableRow>
        ))}
        {galpon.gastosDetalle.map((linea) => (
          <TableRow key={`gasto-${linea.id}`}>
            <TableCell>
              {linea.concepto}
              {linea.compartido && (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                  Parte de un gasto compartido
                </Typography>
              )}
            </TableCell>
            <TableCell align="right" sx={{ whiteSpace: "nowrap", verticalAlign: "top" }}>{formatMoney(linea.valor)}</TableCell>
          </TableRow>
        ))}
        <TableRow sx={totalRowSx}>
          <TableCell>Total gastos</TableCell>
          <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>{formatMoney(galpon.insumos + galpon.gastos)}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

function DeudaRows({ galpon }: { galpon: ResultadoGalpon }) {
  const filas = [
    { label: "Deuda anterior", value: galpon.deudaAnterior },
    { label: "Abono a la deuda", value: galpon.abonoDeuda },
    { label: "Deuda que queda", value: galpon.deudaFinal },
  ].filter((fila) => fila.value !== 0);
  if (!filas.length) return null;
  return (
    <Box sx={{ px: 2, pb: 1.5, display: "grid", gap: 0.5 }}>
      {filas.map((fila) => (
        <Box key={fila.label} sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
          <Typography variant="body2" color="text.secondary">{fila.label}</Typography>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "error.main" }}>{formatMoney(fila.value)}</Typography>
        </Box>
      ))}
    </Box>
  );
}

/**
 * Hoja de un galpón como la del cuaderno: ventas por categoría y precio con el
 * restante en bodega, gastos, saldo y reparto entre socios.
 */
export default function GalponSheet({ galpon }: { galpon: ResultadoGalpon }) {
  const perdida = galpon.resultado < 0;
  return (
    <Card elevation={0} variant="outlined" sx={{ ...tableCardSx, height: "100%", display: "flex", flexDirection: "column" }}>
      <Box
        sx={{
          p: 2,
          borderBottom: "1px solid",
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1.5,
          flexWrap: "wrap",
        }}
      >
        <Typography sx={{ fontWeight: 700, fontSize: "1.125rem" }}>{galpon.nombre}</Typography>
        <Chip
          size="small"
          color={perdida ? "error" : "success"}
          variant={perdida ? "outlined" : "filled"}
          label={`Saldo ${formatMoney(galpon.resultado)}`}
          sx={{ fontWeight: 800 }}
        />
      </Box>

      <Typography sx={sectionTitleSx}>VENTAS</Typography>
      {galpon.bodega.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ px: 2, pb: 2 }}>
          Sin producción ni ventas en la semana.
        </Typography>
      ) : (
        <VentasTable galpon={galpon} />
      )}

      <Typography sx={sectionTitleSx}>GASTOS</Typography>
      <GastosList galpon={galpon} />

      <Box
        sx={{
          mx: 2,
          my: 2,
          p: 1.5,
          borderRadius: 2,
          border: "1px solid",
          borderColor: perdida ? "error.main" : "divider",
          bgcolor: perdida ? alpha(designTokens.color.error.main, 0.06) : "background.default",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Box>
          <Typography sx={{ fontWeight: 800 }}>Saldo</Typography>
          <Typography variant="caption" color="text.secondary">Ventas menos gastos</Typography>
        </Box>
        <Typography sx={{ fontWeight: 900, fontSize: "1.25rem", color: signedColor(galpon.resultado), whiteSpace: "nowrap" }}>
          {formatMoney(galpon.resultado)}
        </Typography>
      </Box>
      <DeudaRows galpon={galpon} />

      <Typography sx={sectionTitleSx}>REPARTO ENTRE SOCIOS</Typography>
      <Box sx={{ px: 2, pb: 2, display: "grid", gap: 0.75, mt: "auto" }}>
        {galpon.socios.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Sin socios registrados.</Typography>
        ) : (
          galpon.socios.map((socio) => (
            <Box key={socio.id} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 0 }}>
                {socio.nombre}
                <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.75 }}>
                  {formatCantidad(socio.porcentaje)} %
                </Typography>
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 800, whiteSpace: "nowrap" }}>{formatMoney(socio.valor)}</Typography>
            </Box>
          ))
        )}
      </Box>
    </Card>
  );
}
