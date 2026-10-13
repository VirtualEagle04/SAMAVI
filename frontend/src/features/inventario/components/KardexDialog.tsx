import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import type { Movimiento, StockInsumo } from "../types/inventario.types";
import { amount } from "../utils/inventarioFormat";
import MovementList from "./MovementList";

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
      <DialogTitle sx={{ fontWeight: 700 }}>
        {item ? `Kardex · ${item.nombre}` : "Kardex"}
      </DialogTitle>
      <DialogContent>
        {item && (
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
              <Chip
                size="small"
                color="success"
                label={`${amount(item.stock)} ${item.unidadMedida}`}
              />
              <Chip
                size="small"
                variant="outlined"
                label={`Mínimo ${amount(item.stockMinimo)}`}
              />
            </Stack>
            <MovementList movements={movements} />
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
