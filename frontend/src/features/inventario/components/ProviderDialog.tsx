import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import type { ProviderForm } from "../types/inventarioForms";
import { isValidEmail, isValidPhone } from "../utils/inventarioFormat";
import InventarioDialogFrame from "./InventarioDialogFrame";

export default function ProviderDialog({
  open,
  form,
  setForm,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  form: ProviderForm;
  setForm: (form: ProviderForm) => void;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  const validPhone = isValidPhone(form.telefono);
  const validEmail = isValidEmail(form.email);
  return (
    <InventarioDialogFrame
      open={open}
      title={form.id ? "Editar proveedor" : "Nuevo proveedor"}
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
            disabled={saving || !form.nombre || !validPhone || !validEmail}
          >
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </>
      }
    >
      <Stack spacing={2} sx={{ pt: 1 }}>
        <TextField
          label="Nombre"
          required
          placeholder="Avícola Sur"
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
        />
        <TextField
          label="Teléfono"
          value={form.telefono}
          placeholder="300 123 4567"
          onChange={(e) => setForm({ ...form, telefono: e.target.value })}
          error={!validPhone}
          helperText={
            !validPhone
              ? "Usa entre 7 y 20 caracteres numéricos."
              : "Ejemplo: 300 123 4567"
          }
        />
        <TextField
          label="Correo"
          type="email"
          value={form.email}
          placeholder="compras@proveedor.com"
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          error={!validEmail}
          helperText={!validEmail ? "Ingresa un correo válido." : "Opcional"}
        />
        <TextField
          label="Dirección"
          value={form.direccion}
          placeholder="Carrera 10 # 20-30"
          onChange={(e) => setForm({ ...form, direccion: e.target.value })}
        />
      </Stack>
    </InventarioDialogFrame>
  );
}
