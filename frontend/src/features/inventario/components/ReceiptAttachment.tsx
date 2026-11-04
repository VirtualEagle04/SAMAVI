import { useEffect, useState, type ChangeEvent, type DragEvent } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import FeedbackAlert from "../../../components/organisms/FeedbackAlert";
import { receiptMimeTypes } from "../utils/inventarioFormat";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = "application/pdf,image/jpeg,image/png";
const PREVIEW_HEIGHT = { xs: 220, sm: 280 };

/** Mismas reglas que el backend (`inventario.routes.ts`): PDF, JPG o PNG de máximo 5 MB. */
function validateReceipt(file: File): string | null {
  if (file.size > MAX_BYTES) return "El recibo supera el tamaño máximo de 5 MB.";
  if (!receiptMimeTypes.has(file.type)) return "Formato no permitido. Usa PDF, JPG o PNG.";
  return null;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("es-CO", { maximumFractionDigits: 1 })} MB`;
}

/**
 * URL temporal del archivo; se libera al cambiarlo o al desmontar. Va en un
 * efecto (y no en `useMemo`) porque en modo estricto React desmonta y vuelve a
 * montar: con `useMemo` la URL quedaría liberada y la vista previa rota.
 */
function useObjectUrl(file: File | undefined): string | null {
  const [entry, setEntry] = useState<{ file: File; url: string } | null>(null);
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setEntry({ file, url });
    return () => URL.revokeObjectURL(url);
  }, [file]);
  // Solo se devuelve la URL del archivo actual: la del anterior ya fue liberada.
  return entry && entry.file === file ? entry.url : null;
}

type Props = {
  receipt?: File;
  setReceipt: (file: File | undefined) => void;
  receiptError: string;
  setReceiptError: (message: string) => void;
  disabled?: boolean;
};

/** Adjuntar el soporte de una compra con vista previa para confirmar que es el archivo correcto. */
export default function ReceiptAttachment({ receipt, setReceipt, receiptError, setReceiptError, disabled = false }: Props) {
  const url = useObjectUrl(receipt);
  const [dragging, setDragging] = useState(false);
  const isPdf = receipt?.type === "application/pdf";

  const pick = (file: File | undefined) => {
    if (!file) return;
    const error = validateReceipt(file);
    if (error) {
      setReceipt(undefined);
      setReceiptError(error);
      return;
    }
    setReceipt(file);
    setReceiptError("");
  };
  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    pick(event.target.files?.[0]);
    // Permite volver a elegir el mismo archivo tras un error o tras quitarlo.
    event.target.value = "";
  };
  const onDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setDragging(false);
    if (!disabled) pick(event.dataTransfer.files?.[0]);
  };
  const remove = () => {
    setReceipt(undefined);
    setReceiptError("");
  };
  const openInTab = () => {
    if (url) window.open(url, "_blank", "noopener");
  };

  const fileInput = <input hidden type="file" accept={ACCEPT} onChange={onInputChange} disabled={disabled} />;

  return (
    <Box>
      <Typography sx={{ fontWeight: 700, mb: 1 }}>Soporte de la compra</Typography>

      {!receipt ? (
        <Box
          component="label"
          onDragOver={(event: DragEvent<HTMLElement>) => {
            event.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0.5,
            p: 2.5,
            border: "2px dashed",
            borderColor: dragging ? "secondary.main" : receiptError ? "error.main" : "divider",
            borderRadius: 2,
            bgcolor: dragging ? "rgba(200, 122, 87, 0.08)" : "background.default",
            textAlign: "center",
            cursor: disabled ? "default" : "pointer",
            transition: "border-color 150ms, background-color 150ms",
            "&:hover": disabled ? undefined : { borderColor: "secondary.main" },
            "&:focus-within": { borderColor: "secondary.main" },
          }}
        >
          <CloudUploadOutlinedIcon sx={{ color: "text.secondary", fontSize: 32 }} />
          <Typography sx={{ fontWeight: 700 }}>
            <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>Arrastra el recibo aquí o </Box>
            <Box component="span" sx={{ color: "secondary.dark", textDecoration: "underline" }}>elige un archivo</Box>
          </Typography>
          <Typography variant="caption" color="text.secondary">
            PDF, JPG o PNG · máximo 5 MB · opcional
          </Typography>
          {fileInput}
        </Box>
      ) : (
        <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 1.5, py: 1 }}>
            {isPdf ? (
              <PictureAsPdfOutlinedIcon sx={{ color: "error.main" }} />
            ) : (
              <ImageOutlinedIcon sx={{ color: "info.main" }} />
            )}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap title={receipt.name}>
                {receipt.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {isPdf ? "PDF" : "Imagen"} · {formatSize(receipt.size)}
              </Typography>
            </Box>
            <Tooltip title="Abrir en otra pestaña">
              <span>
                <IconButton aria-label="Abrir el recibo en otra pestaña" onClick={openInTab} disabled={!url}>
                  <OpenInNewRoundedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Cambiar archivo">
              <IconButton component="label" aria-label="Cambiar el recibo" disabled={disabled}>
                <SwapHorizRoundedIcon fontSize="small" />
                {fileInput}
              </IconButton>
            </Tooltip>
            <Tooltip title="Quitar">
              <span>
                <IconButton aria-label="Quitar el recibo" onClick={remove} disabled={disabled}>
                  <DeleteOutlineRoundedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>

          <Box
            sx={{
              height: PREVIEW_HEIGHT,
              bgcolor: "background.default",
              borderTop: "1px solid",
              borderColor: "divider",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {!url ? null : isPdf ? (
              // Si el navegador no muestra PDF incrustados (p. ej. Chrome en Android), se ve el contenido alternativo.
              <Box component="object" data={url} type="application/pdf" aria-label={`Vista previa de ${receipt.name}`} sx={{ width: "100%", height: "100%", border: 0 }}>
                <Box sx={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1, p: 2, textAlign: "center" }}>
                  <PictureAsPdfOutlinedIcon sx={{ fontSize: 40, color: "text.disabled" }} />
                  <Typography variant="body2" color="text.secondary">
                    Este navegador no muestra el PDF aquí.
                  </Typography>
                  <Button size="small" variant="outlined" startIcon={<OpenInNewRoundedIcon />} onClick={openInTab}>
                    Abrir el PDF
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box
                component="img"
                src={url}
                alt={`Vista previa de ${receipt.name}`}
                onClick={openInTab}
                sx={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", cursor: "zoom-in", display: "block" }}
              />
            )}
          </Box>
        </Box>
      )}

      {receiptError && (
        <FeedbackAlert severity="error" sx={{ mt: 1 }}>
          {receiptError}
        </FeedbackAlert>
      )}
    </Box>
  );
}
