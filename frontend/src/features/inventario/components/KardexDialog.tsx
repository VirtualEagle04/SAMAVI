import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import type { Movimiento, StockInsumo } from "../types/inventario.types";

const amount = (value: number | string) =>
  Number(value).toLocaleString("es-CO", { maximumFractionDigits: 2 });
const dateTime = (value: string) =>
  new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export default function KardexDialog({
  open,
  item,
  movements,
  onClose,
}: {
  open: boolean;
  item: StockInsumo | null;
  movements: Movimiento[];
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ fontWeight: 900 }}>
        {item ? `Kardex · ${item.nombre}` : "Kardex"}
      </DialogTitle>
      <DialogContent dividers>
        {item && (
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
              <Chip
                label={`${amount(item.stock)} ${item.unidadMedida}`}
                color="success"
              />
              <Chip
                label={`Mínimo ${amount(item.stockMinimo)}`}
                variant="outlined"
              />
            </Stack>
            {movements.length ? (
              movements.map((movement) => {
                const input = movement.tipoMovimiento.efecto === "entrada";
                return (
                  <Stack
                    key={String(movement.id)}
                    direction="row"
                    sx={{
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 1,
                      p: 1.5,
                      border: "1px solid",
                      borderColor: input ? "#acd1b5" : "#e7c58f",
                      borderRadius: 2,
                    }}
                  >
                    <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                      <strong>{movement.tipoMovimiento.nombre}</strong>
                      <span>
                        {dateTime(movement.fecha)} ·{" "}
                        {movement.idCompra
                          ? `Compra #${movement.idCompra}`
                          : movement.idGalpon
                            ? `Galpón ${movement.idGalpon}`
                            : "Bodega"}
                      </span>
                    </Stack>
                    <strong>
                      {input ? "+" : "-"}
                      {amount(movement.cantidad)}
                    </strong>
                  </Stack>
                );
              })
            ) : (
              <span>No hay movimientos registrados.</span>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
