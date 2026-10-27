import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import EmptyState from "../../../components/molecules/EmptyState";
import TableToolbar from "../../../components/molecules/TableToolbar";
import {
  tableCardSx,
  tableMobileCardSx,
  tableMobilePrimaryTextSx,
  tableSx,
} from "../../../components/tableStyles";
import { formatFullDate } from "../../dashboard/components/weeklySummary.utils";
import type { GastoSemana } from "../types/consolidacion.types";
import { formatMoney } from "./consolidacion.utils";

type Props = {
  gastos: GastoSemana[];
  /** Se puede agregar o borrar gastos (semana abierta y permiso INGRESAR_GASTO). */
  editable: boolean;
  onAdd: () => void;
  onDelete: (gasto: GastoSemana) => void;
};

function GalponChips({ gasto }: { gasto: GastoSemana }) {
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
      {gasto.galpones.map((galpon) => (
        <Chip key={galpon.id} size="small" variant="outlined" label={`${galpon.nombre} · ${formatMoney(galpon.valor)}`} />
      ))}
    </Box>
  );
}

/** Gastos de la semana y su división en partes iguales entre los galpones elegidos. */
export default function GastosTable({ gastos, editable, onAdd, onDelete }: Props) {
  const total = gastos.reduce((suma, gasto) => suma + gasto.valor, 0);
  const deleteButton = (gasto: GastoSemana) => (
    <Tooltip title="Borrar gasto">
      <IconButton aria-label={`Borrar gasto ${gasto.concepto}`} onClick={() => onDelete(gasto)}>
        <DeleteOutlineRoundedIcon />
      </IconButton>
    </Tooltip>
  );

  return (
    <Card elevation={0} variant="outlined" sx={tableCardSx}>
      <TableToolbar
        title="Gastos de la semana"
        description="Cada gasto se divide en partes iguales entre los galpones que lo comparten."
        actions={editable ? (
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={onAdd}
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            Agregar gasto
          </Button>
        ) : undefined}
      />
      {gastos.length === 0 ? (
        <EmptyState
          icon={<ReceiptLongRoundedIcon />}
          title="Sin gastos registrados"
          description={editable
            ? "No hay gastos con fecha dentro de esta semana. Agrega el primero con el botón de arriba."
            : "No hay gastos con fecha dentro de esta semana."}
        />
      ) : (
        <>
          <Box sx={{ display: { xs: "grid", md: "none" }, gap: 1, p: 1.5 }}>
            {gastos.map((gasto) => (
              <Box key={gasto.id} sx={tableMobileCardSx}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ ...tableMobilePrimaryTextSx, overflowWrap: "anywhere" }}>{gasto.concepto}</Typography>
                    <Typography variant="caption" color="text.secondary">{formatFullDate(gasto.fecha)}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
                    <Typography sx={{ ...tableMobilePrimaryTextSx, fontWeight: 800 }}>{formatMoney(gasto.valor)}</Typography>
                    {editable && deleteButton(gasto)}
                  </Box>
                </Box>
                <Box sx={{ mt: 1.25 }}>
                  <GalponChips gasto={gasto} />
                </Box>
              </Box>
            ))}
            <Box sx={{ display: "flex", justifyContent: "space-between", px: 0.5, pt: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>Total</Typography>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>{formatMoney(total)}</Typography>
            </Box>
          </Box>
          <TableContainer sx={{ display: { xs: "none", md: "block" } }}>
            <Table sx={{ ...tableSx, minWidth: 0 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Concepto</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Galpones</TableCell>
                  <TableCell align="right">Valor</TableCell>
                  {editable && <TableCell align="right" />}
                </TableRow>
              </TableHead>
              <TableBody>
                {gastos.map((gasto) => (
                  <TableRow key={gasto.id}>
                    <TableCell sx={{ fontWeight: 700 }}>{gasto.concepto}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{formatFullDate(gasto.fecha)}</TableCell>
                    <TableCell><GalponChips gasto={gasto} /></TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>{formatMoney(gasto.valor)}</TableCell>
                    {editable && <TableCell align="right">{deleteButton(gasto)}</TableCell>}
                  </TableRow>
                ))}
                <TableRow sx={{ bgcolor: "background.default", "& td": { fontWeight: 800, borderBottom: 0 } }}>
                  <TableCell colSpan={3}>Total</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>{formatMoney(total)}</TableCell>
                  {editable && <TableCell />}
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Card>
  );
}
