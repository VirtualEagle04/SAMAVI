import AttachFileRoundedIcon from "@mui/icons-material/AttachFileRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { pluralize } from "../../../utils/plural";
import type { Compra } from "../types/inventario.types";
import { amount, date, dateTime, money } from "../utils/inventarioFormat";
import {
  tableMobileCardSx,
  tableMobilePrimaryTextSx,
  tableSx,
} from "../../../components/tableStyles";

const tileSx = {
  p: 1.5,
  border: "1px solid",
  borderColor: "divider",
  borderRadius: 2,
  bgcolor: "background.default",
  minWidth: 0,
};

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={tileSx}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 700, overflowWrap: "anywhere" }}>
        {value}
      </Typography>
    </Box>
  );
}

export default function CompraDetailsDialog({
  purchase,
  onClose,
  onReceipt,
}: {
  purchase: Compra | null;
  onClose: () => void;
  onReceipt: (purchase: Compra) => void;
}) {
  return (
    <Dialog open={purchase !== null} onClose={onClose} fullWidth maxWidth="md">
      {purchase && (
        <>
          <DialogTitle sx={{ fontWeight: 700, pb: 0.5 }}>
            Compra #{purchase.id}
          </DialogTitle>
          <DialogContent>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Registrada el {dateTime(purchase.creadoEn)}
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" },
                gap: 1.5,
                mb: 2.5,
              }}
            >
              <SummaryTile label="Fecha de compra" value={date(purchase.fecha)} />
              <SummaryTile
                label="Proveedor"
                value={purchase.proveedor.nombre}
              />
              <SummaryTile
                label="Número de factura"
                value={purchase.numeroFactura || "Sin factura"}
              />
              <SummaryTile
                label="Insumos"
                value={pluralize(purchase.detalles.length, "insumo")}
              />
            </Box>

            <Typography sx={{ fontWeight: 700, mb: 1 }}>
              Detalle de la compra
            </Typography>

            <Box sx={{ display: { xs: "grid", sm: "none" }, gap: 1 }}>
              {purchase.detalles.map((line) => (
                <Box
                  key={`${line.idCompra}-${line.idInsumo}-${line.lote ?? ""}`}
                  sx={tableMobileCardSx}
                >
                  <Typography sx={tableMobilePrimaryTextSx}>
                    {line.insumo.nombre}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {line.insumo.codigo}
                    {line.lote ? ` · Lote ${line.lote}` : ""}
                    {line.fechaVencimiento
                      ? ` · Vence ${date(line.fechaVencimiento)}`
                      : ""}
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 1,
                      mt: 1,
                      pt: 1,
                      borderTop: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      {amount(line.cantidad)} {line.insumo.unidadMedida} ×{" "}
                      {money(line.costoUnitario)}
                    </Typography>
                    <Typography
                      sx={{
                        ...tableMobilePrimaryTextSx,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {money(line.subtotal)}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>

            <TableContainer
              sx={{
                display: { xs: "none", sm: "block" },
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
              }}
            >
              <Table
                size="small"
                sx={{ ...tableSx, minWidth: 0 }}
                aria-label="Detalle de la compra"
              >
                <TableHead>
                  <TableRow>
                    <TableCell>INSUMO</TableCell>
                    <TableCell align="right">CANTIDAD</TableCell>
                    <TableCell align="right">COSTO UNITARIO</TableCell>
                    <TableCell>LOTE</TableCell>
                    <TableCell>VENCE</TableCell>
                    <TableCell align="right">SUBTOTAL</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {purchase.detalles.map((line) => (
                    <TableRow
                      key={`${line.idCompra}-${line.idInsumo}-${line.lote ?? ""}`}
                    >
                      <TableCell>
                        <Typography sx={{ fontWeight: 700 }}>
                          {line.insumo.nombre}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {line.insumo.codigo}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                        {amount(line.cantidad)} {line.insumo.unidadMedida}
                      </TableCell>
                      <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                        {money(line.costoUnitario)}
                      </TableCell>
                      <TableCell>{line.lote || "—"}</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        {line.fechaVencimiento
                          ? date(line.fechaVencimiento)
                          : "—"}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 700, whiteSpace: "nowrap" }}
                      >
                        {money(line.subtotal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                mt: 1.5,
                p: 1.5,
                borderRadius: 2,
                bgcolor: "background.default",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography sx={{ fontWeight: 700 }}>Total</Typography>
              <Typography sx={{ fontWeight: 700, color: "primary.main" }}>
                {money(purchase.total)}
              </Typography>
            </Box>

            {purchase.observaciones && (
              <Box sx={{ mt: 2 }}>
                <Typography sx={{ fontWeight: 700 }}>Observaciones</Typography>
                <Typography color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
                  {purchase.observaciones}
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            {purchase.reciboMimeType ? (
              <Button
                startIcon={<AttachFileRoundedIcon />}
                onClick={() => onReceipt(purchase)}
              >
                Ver recibo
              </Button>
            ) : (
              <Typography variant="caption" color="text.disabled" sx={{ mr: "auto" }}>
                Sin recibo adjunto
              </Typography>
            )}
            <Button variant="contained" onClick={onClose}>
              Cerrar
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
