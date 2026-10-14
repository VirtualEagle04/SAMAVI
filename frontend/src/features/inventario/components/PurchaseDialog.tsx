import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AttachFileRoundedIcon from "@mui/icons-material/AttachFileRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import FeedbackAlert from "../../../components/organisms/FeedbackAlert";
import type { Insumo, Proveedor } from "../types/inventario.types";
import { emptyLine, type PurchaseLine } from "../types/inventarioForms";
import {
  formatCopInput,
  money,
  receiptMimeTypes,
} from "../utils/inventarioFormat";
import InventarioDialogFrame from "./InventarioDialogFrame";
import { tableMobileCardSx } from "../../../components/tableStyles";

export default function PurchaseDialog({
  open,
  providers,
  insumos,
  provider,
  setProvider,
  date,
  setDate,
  invoice,
  setInvoice,
  notes,
  setNotes,
  lines,
  setLines,
  total,
  receipt,
  setReceipt,
  receiptError,
  setReceiptError,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  providers: Proveedor[];
  insumos: Insumo[];
  provider: string;
  setProvider: (value: string) => void;
  date: string;
  setDate: (value: string) => void;
  invoice: string;
  setInvoice: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
  lines: PurchaseLine[];
  setLines: (lines: PurchaseLine[]) => void;
  total: number;
  receipt?: File;
  setReceipt: (file: File | undefined) => void;
  receiptError: string;
  setReceiptError: (message: string) => void;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  const valid = Boolean(
    provider &&
      lines.every(
        (line) =>
          line.insumoId &&
          Number(line.cantidad) > 0 &&
          Number(line.costoUnitario) >= 0,
      ),
  );
  const updateLine = (index: number, patch: Partial<PurchaseLine>) =>
    setLines(
      lines.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );

  return (
    <InventarioDialogFrame
      open={open}
      title="Registrar compra"
      subtitle="Todos los valores monetarios se expresan en $ COP."
      saving={saving}
      onClose={onClose}
      actions={
        <>
          <Button onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={onSave}
            disabled={
              saving || !valid || !insumos.length || Boolean(receiptError)
            }
          >
            {saving ? "Guardando..." : "Guardar compra"}
          </Button>
        </>
      }
    >
      <Stack spacing={2} sx={{ pt: 1 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            select
            label="Proveedor"
            required
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          >
            <MenuItem value="">Selecciona</MenuItem>
            {providers.map((item) => (
              <MenuItem key={item.id} value={item.id} sx={{ whiteSpace: "normal" }}>
                {item.nombre}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Fecha"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Stack>
        <TextField
          label="Número de factura"
          value={invoice}
          placeholder="FAC-12345"
          onChange={(e) => setInvoice(e.target.value)}
        />
        <Typography sx={{ fontWeight: 700, mt: 1 }}>
          Detalle de la compra
        </Typography>
        {lines.map((line, index) => (
          <Box key={index} sx={tableMobileCardSx}>
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <TextField
                  select
                  label="Insumo"
                  required
                  value={line.insumoId}
                  onChange={(e) => updateLine(index, { insumoId: e.target.value })}
                >
                  <MenuItem value="">Selecciona</MenuItem>
                  {insumos.map((item) => (
                    <MenuItem key={item.id} value={item.id} sx={{ whiteSpace: "normal" }}>
                      {item.codigo} · {item.nombre}
                    </MenuItem>
                  ))}
                </TextField>
                <IconButton
                  aria-label="Quitar línea"
                  disabled={lines.length === 1}
                  onClick={() => setLines(lines.filter((_, i) => i !== index))}
                >
                  <DeleteOutlineRoundedIcon />
                </IconButton>
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <TextField
                  label="Cantidad"
                  type="number"
                  required
                  placeholder="100"
                  value={line.cantidad}
                  onChange={(e) => updateLine(index, { cantidad: e.target.value })}
                />
                <TextField
                  label="Costo unitario"
                  type="text"
                  required
                  placeholder="1,500"
                  value={formatCopInput(line.costoUnitario)}
                  onChange={(e) =>
                    updateLine(index, {
                      costoUnitario: e.target.value.replace(/\D/g, ""),
                    })
                  }
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">$</InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">COP</InputAdornment>
                      ),
                    },
                  }}
                />
                <TextField
                  label="Lote"
                  value={line.lote}
                  placeholder="LOT-2026-001"
                  onChange={(e) => updateLine(index, { lote: e.target.value })}
                />
              </Stack>
            </Stack>
          </Box>
        ))}
        <Button
          startIcon={<AddRoundedIcon />}
          onClick={() => setLines([...lines, { ...emptyLine }])}
        >
          Agregar línea
        </Button>
        <TextField
          label="Observaciones"
          multiline
          minRows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <Button
          component="label"
          variant="outlined"
          startIcon={<AttachFileRoundedIcon />}
          sx={{ justifyContent: "flex-start" }}
        >
          {receipt ? receipt.name : "Adjuntar recibo (máx. 5 MB)"}
          <input
            hidden
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 5 * 1024 * 1024) {
                setReceipt(undefined);
                setReceiptError("El recibo supera el tamaño máximo de 5 MB.");
                return;
              }
              if (!receiptMimeTypes.has(file.type)) {
                setReceipt(undefined);
                setReceiptError("Formato no permitido. Usa PDF, JPG o PNG.");
                return;
              }
              setReceipt(file);
              setReceiptError("");
            }}
          />
        </Button>
        {receiptError && (
          <FeedbackAlert severity="error">{receiptError}</FeedbackAlert>
        )}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            p: 1.5,
            borderRadius: 2,
            bgcolor: "background.default",
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography sx={{ fontWeight: 700 }}>Total</Typography>
          <Typography sx={{ fontWeight: 700, color: "primary.main" }}>
            {money(total)}
          </Typography>
        </Box>
      </Stack>
    </InventarioDialogFrame>
  );
}
