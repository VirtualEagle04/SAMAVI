import type { ReactNode } from "react";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";

export default function InventarioDialogFrame({
  open,
  title,
  subtitle,
  saving = false,
  onClose,
  children,
  actions,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  saving?: boolean;
  onClose: () => void;
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!saving) onClose();
      }}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle sx={{ fontWeight: 700, pb: subtitle ? 0.5 : undefined }}>
        {title}
      </DialogTitle>
      <DialogContent>
        {subtitle && (
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {subtitle}
          </Typography>
        )}
        {children}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>{actions}</DialogActions>
    </Dialog>
  );
}
