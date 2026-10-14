import { useState } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import AttachFileRoundedIcon from "@mui/icons-material/AttachFileRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import IconButton from "@mui/material/IconButton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import type { Compra } from "../types/inventario.types";
import { date, money } from "../utils/inventarioFormat";
import { pluralize } from "../../../utils/plural";
import EmptyState from "../../../components/molecules/EmptyState";
import TableToolbar from "../../../components/molecules/TableToolbar";
import {
  tableCardSx,
  tableMobileCardSx,
  tableMobilePrimaryTextSx,
  tablePaginationLabels,
  tablePaginationSx,
  tableSx,
} from "../../../components/tableStyles";

const itemsLabel = (purchase: Compra) =>
  `${purchase.detalles.length} ${purchase.detalles.length === 1 ? "insumo" : "insumos"}`;

function ReceiptAction({
  purchase,
  onReceipt,
}: {
  purchase: Compra;
  onReceipt: (purchase: Compra) => void;
}) {
  if (!purchase.reciboMimeType)
    return (
      <Typography variant="caption" color="text.disabled">
        Sin archivo
      </Typography>
    );
  return (
    <IconButton
      aria-label="Abrir recibo"
      title="Abrir recibo"
      size="small"
      sx={{ p: { xs: 1.25, sm: 0.625 } }}
      onClick={() => onReceipt(purchase)}
    >
      <AttachFileRoundedIcon fontSize="small" />
    </IconButton>
  );
}

export default function ComprasTable({
  purchases,
  onNew,
  onDetails,
  onReceipt,
}: {
  purchases: Compra[];
  onNew: () => void;
  onDetails: (purchase: Compra) => void;
  onReceipt: (purchase: Compra) => void;
}) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const lastPage = Math.max(0, Math.ceil(purchases.length / rowsPerPage) - 1);
  const safePage = Math.min(page, lastPage);
  const rows = purchases.slice(
    safePage * rowsPerPage,
    (safePage + 1) * rowsPerPage,
  );

  return (
    <Card elevation={0} sx={tableCardSx}>
      <TableToolbar
        title="Compras"
        description={`${pluralize(purchases.length, "compra reciente", "compras recientes")} · entradas de mercancía y documentos de soporte.`}
        actions={
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={onNew}
            sx={{ whiteSpace: "nowrap" }}
          >
            Nueva compra
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<ReceiptLongRoundedIcon />}
          title="Sin compras todavía"
          description="Registra la primera entrada para valorar el inventario."
        />
      ) : (
        <>
        <Box sx={{ display: { xs: "grid", sm: "none" }, gap: 1, p: 1.5 }}>
          {rows.map((purchase) => (
              <Box key={purchase.id} sx={tableMobileCardSx}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 1,
                    mb: 0.8,
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={tableMobilePrimaryTextSx}>
                      {purchase.proveedor.nombre}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {date(purchase.fecha)} · {itemsLabel(purchase)}
                    </Typography>
                  </Box>
                  <ReceiptAction purchase={purchase} onReceipt={onReceipt} />
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    pt: 1,
                    borderTop: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Total
                  </Typography>
                  <Typography sx={tableMobilePrimaryTextSx}>
                    {money(purchase.total)}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
                  <Button
                    size="small"
                    startIcon={<VisibilityRoundedIcon />}
                    onClick={() => onDetails(purchase)}
                  >
                    Detalle
                  </Button>
                </Box>
              </Box>
          ))}
        </Box>

        <TableContainer sx={{ display: { xs: "none", sm: "block" } }}>
          <Table sx={tableSx} aria-label="Tabla de compras">
            <TableHead>
              <TableRow>
                <TableCell>FECHA</TableCell>
                <TableCell>PROVEEDOR</TableCell>
                <TableCell>INSUMOS</TableCell>
                <TableCell align="right">TOTAL</TableCell>
                <TableCell align="center">RECIBO</TableCell>
                <TableCell align="center">ACCIONES</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((purchase) => (
                  <TableRow key={purchase.id} hover>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {date(purchase.fecha)}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      {purchase.proveedor.nombre}
                    </TableCell>
                    <TableCell>{itemsLabel(purchase)}</TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 700, whiteSpace: "nowrap" }}
                    >
                      {money(purchase.total)}
                    </TableCell>
                    <TableCell align="center">
                      <ReceiptAction purchase={purchase} onReceipt={onReceipt} />
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        startIcon={<VisibilityRoundedIcon />}
                        onClick={() => onDetails(purchase)}
                      >
                        Detalle
                      </Button>
                    </TableCell>
                  </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={purchases.length}
          page={safePage}
          onPageChange={(_event, value) => setPage(value)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(Number(event.target.value));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50]}
          {...tablePaginationLabels}
          sx={tablePaginationSx}
        />
        </>
      )}
    </Card>
  );
}
