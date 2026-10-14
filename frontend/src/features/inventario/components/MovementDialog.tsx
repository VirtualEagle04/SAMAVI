import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import type { GalponResumen } from "../../galpones/types/galpones.types";
import type { StockInsumo } from "../types/inventario.types";
import type { MovementForm } from "../types/inventarioForms";
import {
  amount,
  formatCopInput,
  movementOptions,
} from "../utils/inventarioFormat";
import InventarioDialogFrame from "./InventarioDialogFrame";

export default function MovementDialog({
  open,
  stock,
  galpones,
  form,
  setForm,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  stock: StockInsumo[];
  galpones: GalponResumen[];
  form: MovementForm;
  setForm: (form: MovementForm) => void;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  const option = movementOptions.find(
    (item) => item.value === form.codigoTipoMovimiento,
  );
  const valid = Boolean(
    form.insumoId &&
      Number(form.cantidad) > 0 &&
      (option?.value !== "CONSUMO_GALPON" || form.galponId),
  );
  return (
    <InventarioDialogFrame
      open={open}
      title="Registrar movimiento"
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
            disabled={saving || !valid}
          >
            {saving ? "Guardando..." : "Registrar"}
          </Button>
        </>
      }
    >
      <Stack spacing={2} sx={{ pt: 1 }}>
        <TextField
          select
          label="Tipo de movimiento"
          required
          value={form.codigoTipoMovimiento}
          onChange={(e) =>
            setForm({ ...form, codigoTipoMovimiento: e.target.value })
          }
        >
          {movementOptions.map((item) => (
            <MenuItem key={item.value} value={item.value}>
              {item.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Insumo"
          required
          value={form.insumoId}
          onChange={(e) => setForm({ ...form, insumoId: e.target.value })}
        >
          <MenuItem value="">Selecciona</MenuItem>
          {stock.map((item) => (
            <MenuItem key={item.id} value={item.id} sx={{ whiteSpace: "normal" }}>
              {item.codigo} · {item.nombre} ({amount(item.stock)} disponibles)
            </MenuItem>
          ))}
        </TextField>
        {option?.value === "CONSUMO_GALPON" && (
          <TextField
            select
            label="Galpón"
            required
            value={form.galponId}
            onChange={(e) => setForm({ ...form, galponId: e.target.value })}
            helperText="Obligatorio para consumo en galpón"
          >
            <MenuItem value="">Selecciona</MenuItem>
            {galpones.map((galpon) => (
              <MenuItem key={galpon.id} value={galpon.id}>
                {galpon.nombre}
              </MenuItem>
            ))}
          </TextField>
        )}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="Cantidad"
            type="number"
            required
            placeholder="10"
            value={form.cantidad}
            onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
          />
          <TextField
            label="Costo unitario"
            type="text"
            placeholder="1,500"
            value={formatCopInput(form.costoUnitario)}
            onChange={(e) =>
              setForm({
                ...form,
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
        </Stack>
        <TextField
          label="Observaciones"
          multiline
          minRows={2}
          value={form.observaciones}
          onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
        />
      </Stack>
    </InventarioDialogFrame>
  );
}
