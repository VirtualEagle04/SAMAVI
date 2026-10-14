import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import type { InsumoForm } from "../types/inventarioForms";
import { formatCopInput } from "../utils/inventarioFormat";
import InventarioDialogFrame from "./InventarioDialogFrame";

export default function InsumoDialog({
  open,
  form,
  setForm,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  form: InsumoForm;
  setForm: (form: InsumoForm) => void;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <InventarioDialogFrame
      open={open}
      title={form.id ? "Editar insumo" : "Nuevo insumo"}
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
              saving || !form.codigo || !form.nombre || !form.unidadMedida
            }
          >
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </>
      }
    >
      <Stack spacing={2} sx={{ pt: 1 }}>
        <TextField
          label="Código"
          required
          value={form.codigo}
          onChange={(e) =>
            setForm({ ...form, codigo: e.target.value.toUpperCase() })
          }
          placeholder="BAN-30"
        />
        <TextField
          label="Nombre"
          required
          placeholder="Bandeja 30 huevos"
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
        />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="Unidad de medida"
            required
            placeholder="unidad, bulto, kg"
            value={form.unidadMedida}
            onChange={(e) => setForm({ ...form, unidadMedida: e.target.value })}
          />
          <TextField
            label="Stock mínimo"
            required
            placeholder="500"
            type="number"
            value={form.stockMinimo}
            onChange={(e) => setForm({ ...form, stockMinimo: e.target.value })}
          />
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="Costo actual"
            type="text"
            placeholder="1,500"
            value={formatCopInput(form.costo)}
            onChange={(e) =>
              setForm({ ...form, costo: e.target.value.replace(/\D/g, "") })
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
            label="Descripción"
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
          />
        </Stack>
      </Stack>
    </InventarioDialogFrame>
  );
}
