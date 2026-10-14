import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import CategoryBadge from "../../../components/atoms/CategoryBadge";
import { tableCardSx } from "../../../components/tableStyles";
import type { ResumenSemanalCategoria } from "../types/dashboard.types";
import { formatCantidad } from "./weeklySummary.utils";

type CategoryTotalsCardProps = {
  title: string;
  description: string;
  rows: ResumenSemanalCategoria[];
  field: "produccion" | "ventas" | "bodega";
};

/** Totales de la semana por categoría (producción, ventas o bodega final). */
export default function CategoryTotalsCard({
  title,
  description,
  rows,
  field,
}: CategoryTotalsCardProps) {
  const total = rows.reduce((sum, row) => sum + row[field], 0);
  return (
    <Card elevation={0} variant="outlined" sx={tableCardSx}>
      <Box sx={{ px: 2, pt: 2, pb: 1 }}>
        <Typography variant="h6" sx={{ fontSize: "1rem" }}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {description}
        </Typography>
      </Box>
      <Table size="small">
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.codigo}>
              <TableCell>
                <Tooltip title={row.nombre} placement="left">
                  <span>
                    <CategoryBadge codigo={row.codigo} />
                  </span>
                </Tooltip>
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  fontWeight: 700,
                  color: row[field] < 0 ? "error.main" : "text.primary",
                }}
              >
                {formatCantidad(row[field])}
              </TableCell>
            </TableRow>
          ))}
          <TableRow sx={{ "& td": { borderBottom: 0 } }}>
            <TableCell sx={{ fontWeight: 800 }}>Total</TableCell>
            <TableCell align="right" sx={{ fontWeight: 800 }}>
              {total.toLocaleString("es-CO")} band.
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Card>
  );
}
