import { useEffect, useState } from "react"
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogTitle from "@mui/material/DialogTitle"
import InputAdornment from "@mui/material/InputAdornment"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import CategoryBadge from "../../../components/atoms/CategoryBadge"
import type { CategoriaComercial, Mayorista, PrecioMayorista } from "../types/comercial.types"

type Props = { cliente: Mayorista | null; categorias: CategoriaComercial[]; precios: PrecioMayorista[]; onClose: () => void; onSave: (category: string, price: number) => Promise<void> }
const formatPrice = (value: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)

export default function PreciosDialog({ cliente, categorias, precios, onClose, onSave }: Props) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  useEffect(() => { setValues(Object.fromEntries(precios.map((p) => [p.codigoCategoriaPeso, formatPrice(Number(p.valorUnitario))]))); setError("") }, [cliente?.id, precios])
  const updateValue = (code: string, raw: string) => { const digits = raw.replace(/\D/g, ""); setValues((current) => ({ ...current, [code]: digits ? formatPrice(Number(digits)) : "" })) }
  const save = async () => {
    const changed = categorias.filter((c) => values[c.codigo] && Number(values[c.codigo].replace(/,/g, "")) > 0)
    if (!changed.length) { setError("Escribe al menos un precio mayor a cero."); return }
    setSaving(true); setError("")
    try { for (const category of changed) await onSave(category.codigo, Number(values[category.codigo].replace(/,/g, ""))); onClose() }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudieron guardar los precios.") }
    finally { setSaving(false) }
  }
  return <Dialog open={Boolean(cliente)} onClose={() => { if (!saving) onClose() }} fullWidth maxWidth="sm" slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
    <DialogTitle sx={{ fontWeight: 800 }}>Precios · {cliente?.nombre}</DialogTitle>
    <DialogContent><Typography color="text.secondary" sx={{ mb: 2 }}>Precio por bandeja para este cliente. Deja vacío lo que no venda.</Typography>
      {categorias.map((category) => <Box key={category.codigo} sx={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 2, alignItems: "center", py: 0.7, borderBottom: "1px solid", borderColor: "divider" }}><CategoryBadge codigo={category.codigo} nombre={category.nombre} /><TextField label="Precio por bandeja" size="small" value={values[category.codigo] ?? ""} onChange={(e) => updateValue(category.codigo, e.target.value)} slotProps={{ htmlInput: { inputMode: "numeric" }, input: { endAdornment: <InputAdornment position="end">COP</InputAdornment> } }} /></Box>)}
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
    </DialogContent><DialogActions sx={{ px: 3, pb: 2.5 }}><Button onClick={onClose} disabled={saving}>Cancelar</Button><Button variant="contained" onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar precios"}</Button></DialogActions>
  </Dialog>
}
