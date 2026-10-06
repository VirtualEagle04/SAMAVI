import DeleteForeverRoundedIcon from "@mui/icons-material/DeleteForeverRounded";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";

export default function DeleteConfirmationDialog({
  open,
  name,
  type,
  onClose,
  onConfirm,
}: {
  open: boolean;
  name: string;
  type: "insumo" | "proveedor";
  onClose: () => void;
  onConfirm: () => void;
}) {
  const label = type === "insumo" ? "insumo" : "proveedor";
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle
        sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 900 }}
      >
        <DeleteForeverRoundedIcon color="error" />
        Eliminar permanentemente
      </DialogTitle>
      <DialogContent dividers>
        <Typography>
          ¿Deseas eliminar permanentemente el {label} <strong>{name}</strong>?
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Esta acción no se puede deshacer. Si tiene registros relacionados, el
          sistema impedirá la eliminación.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          color="error"
          variant="contained"
          onClick={onConfirm}
          startIcon={<DeleteForeverRoundedIcon />}
        >
          Eliminar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
