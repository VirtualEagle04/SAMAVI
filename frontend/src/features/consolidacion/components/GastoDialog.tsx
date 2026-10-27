import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import FeedbackAlert from "../../../components/organisms/FeedbackAlert";
import { formatCopInput } from "../../inventario/utils/inventarioFormat";
import type { GastoPayload } from "../types/consolidacion.types";
import { formatMoney } from "./consolidacion.utils";

type Props = {
  desde: string;
  hasta: string;
  galpones: Array<{ id: number; nombre: string }>;
  onClose: () => void;
  onSave: (data: GastoPayload) => Promise<void>;
};

export default function GastoDialog({ desde, hasta, galpones, onClose, onSave }: Props) {
  const [concepto, setConcepto] = useState("");
  const [valor, setValor] = useState("");
  const [fecha, setFecha] = useState(hasta);
  const [seleccion, setSeleccion] = useState<number[]>(galpones.map((galpon) => galpon.id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const monto = Number(valor);
  const toggle = (id: number) =>
    setSeleccion((actual) => (actual.includes(id) ? actual.filter((item) => item !== id) : [...actual, id]));

  const submit = async () => {
    if (!concepto.trim()) { setError("Escriba el concepto del gasto."); return; }
    if (!monto || monto <= 0) { setError("Escriba el valor del gasto."); return; }
    if (!fecha || fecha < desde || fecha > hasta) { setError("La fecha debe estar dentro de la semana."); return; }
    if (!seleccion.length) { setError("Elija al menos un galpón."); return; }
    setSaving(true); setError("");
    try {
      await onSave({ concepto: concepto.trim(), valor: monto, fecha, galponIds: [...seleccion].sort((a, b) => a - b) });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el gasto.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={() => { if (!saving) onClose(); }} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700 }}>Agregar gasto</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}>
        <TextField
          autoFocus
          label="Concepto"
          value={concepto}
          onChange={(e) => setConcepto(e.target.value.slice(0, 150))}
        />
        <TextField
          label="Valor"
          placeholder="80,000"
          value={formatCopInput(valor)}
          onChange={(e) => setValor(e.target.value.replace(/\D/g, "").slice(0, 8))}
          slotProps={{
            htmlInput: { inputMode: "numeric" },
            input: {
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
              endAdornment: <InputAdornment position="end">COP</InputAdornment>,
            },
          }}
        />
        <TextField
          type="date"
          label="Fecha"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: desde, max: hasta } }}
        />
        <Box>
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 700 }}>¿Qué galpones comparten este gasto?</Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {galpones.map((galpon) => {
              const activo = seleccion.includes(galpon.id);
              return (
                <Chip
                  key={galpon.id}
                  label={galpon.nombre}
                  onClick={() => toggle(galpon.id)}
                  color={activo ? "primary" : "default"}
                  variant={activo ? "filled" : "outlined"}
                  sx={{ height: 40, fontWeight: 700 }}
                />
              );
            })}
          </Box>
          {monto > 0 && seleccion.length > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Cada galpón asume {formatMoney(Math.round((monto / seleccion.length) * 100) / 100)} aprox.
            </Typography>
          )}
        </Box>
        {error && <FeedbackAlert severity="error">{error}</FeedbackAlert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button variant="contained" onClick={() => void submit()} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
      </DialogActions>
    </Dialog>
  );
}
