import { useEffect, useMemo, useState } from "react"
import AddRoundedIcon from "@mui/icons-material/AddRounded"
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded"
import Alert from "@mui/material/Alert"
import Autocomplete from "@mui/material/Autocomplete"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogTitle from "@mui/material/DialogTitle"
import IconButton from "@mui/material/IconButton"
import Stack from "@mui/material/Stack"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import CategoryBadge from "../../../components/atoms/CategoryBadge"
import type { CategoriaComercial, Mayorista, Pedido, PrecioMayorista } from "../types/comercial.types"

type Payload = { mayoristaId: number; detalles: { categoriaPeso: string; cantidadSolicitada: number }[] }
type Props = { open: boolean; mayoristas: Mayorista[]; categorias: CategoriaComercial[]; pedido?: Pedido | null; precios: PrecioMayorista[]; onClienteChange: (id: number) => void; onClose: () => void; onSave: (data: Payload, pedidoId?: number) => Promise<void>; onCreateMayorista?: (nombre: string) => Promise<Mayorista> }
const formatPrice = (value: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)

export default function PedidoFormDialog({ open, mayoristas, categorias, pedido, precios, onClienteChange, onClose, onSave, onCreateMayorista }: Props) {
  const [cliente, setCliente] = useState<Mayorista | null>(null)
  const [cantidades, setCantidades] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createName, setCreateName] = useState("")
  const [error, setError] = useState("")
  const priceMap = useMemo(() => new Map(precios.map((p) => [p.codigoCategoriaPeso, Number(p.valorUnitario)])), [precios])
  const lines = useMemo(() => categorias.filter((category) => (cantidades[category.codigo] ?? 0) > 0), [categorias, cantidades])
  const totalTrays = lines.reduce((sum, line) => sum + cantidades[line.codigo], 0)
  const missingPrices = lines.filter((line) => !priceMap.has(line.codigo))
  const estimated = lines.reduce((sum, line) => sum + cantidades[line.codigo] * (priceMap.get(line.codigo) ?? 0), 0)
  useEffect(() => { if (!open) return; setCliente(pedido ? mayoristas.find((item) => item.id === pedido.idMayorista) ?? null : null); if (pedido) onClienteChange(pedido.idMayorista); setCantidades(Object.fromEntries(pedido?.detalles.map((line) => [line.codigoCategoriaPeso, line.cantidadSolicitada]) ?? [])); setError(""); setCreating(false) }, [open, pedido, mayoristas])
  const close = () => { if (saving) return; setCliente(null); setCantidades({}); setError(""); setCreateName(""); setCreating(false); onClose() }
  const save = async () => { if (!cliente || lines.length === 0) { setError("Elige un cliente y agrega al menos una cantidad."); return }; setSaving(true); setError(""); try { await onSave({ mayoristaId: cliente.id, detalles: lines.map((line) => ({ categoriaPeso: line.codigo, cantidadSolicitada: cantidades[line.codigo] })) }, pedido?.id); setCliente(null); setCantidades({}); onClose() } catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar el pedido.") } finally { setSaving(false) } }
  return <Dialog open={open} onClose={close} fullWidth maxWidth="sm" slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
    <DialogTitle sx={{ pb: 0.5, fontWeight: 800 }}>{pedido ? `Editar pedido #${pedido.id}` : "Nuevo pedido"}</DialogTitle><DialogContent>
      <Typography color="text.secondary" sx={{ mb: 2.5 }}>Elige el cliente y escribe cuántas bandejas pidió.</Typography>
      {creating ? <Stack direction="row" spacing={1} sx={{ mb: 2.5 }}><TextField autoFocus label="Nombre del nuevo cliente" value={createName} onChange={(e) => setCreateName(e.target.value)} /><Button variant="contained" disabled={!createName.trim()} onClick={async () => { if (!onCreateMayorista) return; setSaving(true); setError(""); try { const created = await onCreateMayorista(createName.trim()); setCliente(created); onClienteChange(created.id); setCreating(false); setCreateName("") } catch (e) { setError(e instanceof Error ? e.message : "No se pudo agregar el cliente.") } finally { setSaving(false) } }}>Agregar</Button></Stack> : <Stack direction="row" spacing={1} sx={{ mb: 2.5, alignItems: "center" }}><Autocomplete fullWidth options={mayoristas} value={cliente} onChange={(_, value) => { setCliente(value); if (value) onClienteChange(value.id) }} getOptionLabel={(item) => item.nombre} isOptionEqualToValue={(a, b) => a.id === b.id} renderInput={(params) => <TextField {...params} label="Cliente mayorista" placeholder="Busca por nombre" />} />{onCreateMayorista && !pedido && <Button onClick={() => setCreating(true)} sx={{ minWidth: 118 }}>+ Nuevo cliente</Button>}</Stack>}
      <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}><Box sx={{ display: "grid", gridTemplateColumns: "minmax(110px, 1fr) 140px minmax(105px, auto)", gap: 1, px: 2, py: 1, bgcolor: "#faf5ef" }}><Typography variant="caption" sx={{ fontWeight: 800 }}>PRESENTACIÓN</Typography><Typography variant="caption" sx={{ fontWeight: 800, textAlign: "center" }}>BANDEJAS</Typography><Typography variant="caption" sx={{ fontWeight: 800, textAlign: "right" }}>TOTAL POR PESO</Typography></Box>
        {categorias.map((category, index) => { const count = cantidades[category.codigo] ?? 0; const unitPrice = priceMap.get(category.codigo); const lineTotal = unitPrice === undefined ? null : count * unitPrice; return <Box key={category.codigo} sx={{ display: "grid", gridTemplateColumns: "minmax(110px, 1fr) 140px minmax(105px, auto)", gap: 1, alignItems: "center", px: 2, py: 0.5, borderTop: index === 0 ? 0 : "1px solid", borderColor: "divider" }}><CategoryBadge codigo={category.codigo} nombre={category.nombre} /><Stack direction="row" spacing={0.5} sx={{ alignItems: "center", justifyContent: "center" }}><IconButton aria-label={`Quitar una bandeja de ${category.nombre}`} size="small" disabled={count === 0} onClick={() => setCantidades((state) => ({ ...state, [category.codigo]: Math.max(0, count - 1) }))}><RemoveRoundedIcon fontSize="small" /></IconButton><TextField size="small" type="number" value={count || ""} onChange={(e) => setCantidades((state) => ({ ...state, [category.codigo]: Math.max(0, Math.floor(Number(e.target.value) || 0)) }))} slotProps={{ htmlInput: { min: 0, step: 1, "aria-label": `Bandejas de ${category.nombre}` } }} sx={{ width: 70, "& input": { textAlign: "center", py: 0.8 } }} /><IconButton aria-label={`Agregar una bandeja de ${category.nombre}`} size="small" onClick={() => setCantidades((state) => ({ ...state, [category.codigo]: count + 1 }))}><AddRoundedIcon fontSize="small" /></IconButton></Stack><Typography variant="body2" sx={{ textAlign: "right", fontWeight: 700, whiteSpace: "nowrap", color: lineTotal === null ? "text.disabled" : "text.primary" }}>{lineTotal === null ? "Sin precio" : `${formatPrice(lineTotal)} COP`}</Typography></Box> })}
      </Box>
      <Stack spacing={0.8} sx={{ mt: 2, p: 1.5, bgcolor: "#fff7f1", borderRadius: 1.5 }}><Stack direction="row" sx={{ justifyContent: "space-between" }}><Typography color="text.secondary">Total estimado</Typography><Typography sx={{ fontWeight: 800 }}>{missingPrices.length ? "Configura precios para calcular" : `${formatPrice(estimated)} COP`}</Typography></Stack><Stack direction="row" sx={{ justifyContent: "space-between" }}><Typography color="text.secondary">Total de bandejas</Typography><Typography sx={{ fontWeight: 800 }}>{totalTrays.toLocaleString("en-US")} bandejas</Typography></Stack></Stack>
      {cliente && missingPrices.length > 0 && <Alert severity="info" sx={{ mt: 1.5 }}>Falta precio para: {missingPrices.map((line) => line.nombre).join(", ")}. El estimado solo suma categorías con precio configurado.</Alert>}{error && <Typography color="error" role="alert" sx={{ mt: 1.5 }}>{error}</Typography>}
    </DialogContent><DialogActions sx={{ px: 3, pb: 2.5 }}><Button onClick={close} disabled={saving}>Cancelar</Button><Button variant="contained" onClick={save} disabled={saving}>{saving ? "Guardando…" : pedido ? "Guardar cambios" : "Guardar pedido"}</Button></DialogActions>
  </Dialog>
}
