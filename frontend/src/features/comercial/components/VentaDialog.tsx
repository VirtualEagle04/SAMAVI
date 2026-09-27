import { useEffect, useMemo, useState } from "react"
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import CircularProgress from "@mui/material/CircularProgress"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogTitle from "@mui/material/DialogTitle"
import Divider from "@mui/material/Divider"
import Stack from "@mui/material/Stack"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import CategoryBadge from "../../../components/atoms/CategoryBadge"
import type { DisponibilidadPedido, Pedido, PrecioMayorista } from "../types/comercial.types"

type Props = { pedido: Pedido | null; disponibilidad: DisponibilidadPedido | null; loading: boolean; precios: PrecioMayorista[]; onClose: () => void; onSave: (data: {
  detalles: { categoriaPeso: string; cantidadVendida: number }[]
  distribucion: { galponId: number; categoriaPeso: string; cantidad: number }[]
}) => Promise<void> }

export default function VentaDialog({ pedido, disponibilidad, loading, precios, onClose, onSave }: Props) {
  const [allocation, setAllocation] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  useEffect(() => {
    setAllocation(Object.fromEntries((disponibilidad?.categorias ?? []).flatMap((item) => item.galpones.map((barn) => [`${item.categoriaPeso}:${barn.galponId}`, barn.recomendada]))))
    setError("")
  }, [disponibilidad, pedido?.id])
  const priceMap = useMemo(() => new Map(precios.map((price) => [price.codigoCategoriaPeso, Number(price.valorUnitario)])), [precios])
  const key = (category: string, barn: number) => `${category}:${barn}`
  const changeAllocation = (category: string, barnId: number, value: number) => {
    const line = disponibilidad?.categorias.find((item) => item.categoriaPeso === category)
    if (!line) return
    const target = line.cantidadRecomendada
    const selected = line.galpones.find((barn) => barn.galponId === barnId)
    if (!selected) return
    const nextValue = Math.max(0, Math.min(selected.disponible, Math.floor(value || 0)))
    let remaining = target - nextValue
    const updated = new Map<number, number>([[barnId, nextValue]])
    for (const barn of line.galpones.filter((item) => item.galponId !== barnId)) {
      const amount = Math.min(barn.disponible, remaining)
      updated.set(barn.galponId, amount)
      remaining -= amount
    }
    if (remaining > 0) return
    setAllocation((state) => ({ ...state, ...Object.fromEntries([...updated].map(([id, amount]) => [key(category, id), amount])) }))
  }
  const total = disponibilidad?.categorias.reduce((sum, item) => sum + item.cantidadRecomendada * (priceMap.get(item.categoriaPeso) ?? 0), 0) ?? 0
  const missingPrice = disponibilidad?.categorias.filter((item) => !priceMap.has(item.categoriaPeso)) ?? []
  const submit = async () => {
    if (!pedido || !disponibilidad) return
    const detalles = disponibilidad.categorias.map((line) => ({ categoriaPeso: line.categoriaPeso, cantidadVendida: line.cantidadRecomendada }))
    const distribucion = disponibilidad.categorias.flatMap((line) => line.galpones.map((barn) => ({ galponId: barn.galponId, categoriaPeso: line.categoriaPeso, cantidad: allocation[key(line.categoriaPeso, barn.galponId)] ?? barn.recomendada })).filter((row) => row.cantidad > 0))
    setSaving(true); setError("")
    try { await onSave({ detalles, distribucion }); onClose() }
    catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo confirmar la carga.") }
    finally { setSaving(false) }
  }
  const canSubmit = Boolean(disponibilidad?.cierreRealizado) && !missingPrice.length && !loading

  return <Dialog open={Boolean(pedido)} onClose={() => { if (!saving) onClose() }} fullWidth maxWidth="md" slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
    <DialogTitle sx={{ fontWeight: 800 }}>Cargar pedido · #{pedido?.id}</DialogTitle>
    <DialogContent>
      <Typography color="text.secondary" sx={{ mb: 2 }}>Revisa la existencia de hoy y confirma de qué galpones se toma cada presentación.</Typography>
      {loading ? <Box sx={{ minHeight: 240, display: "grid", placeItems: "center" }}><CircularProgress /></Box> : !disponibilidad?.cierreRealizado ? <Alert severity="warning">Todavía no hay un cierre diario para hoy. Cierra la producción antes de cargar pedidos.</Alert> : <>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2, p: 1.5, bgcolor: "#f7f3ef", borderRadius: 2, justifyContent: "space-between", alignItems: { sm: "center" } }}><Typography variant="body2">Existencia consultada para {new Intl.DateTimeFormat("es-CO", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${disponibilidad.fecha}T00:00:00Z`))}</Typography><Typography sx={{ fontWeight: 800 }}>Estimado: ${total.toLocaleString("en-US")} COP</Typography></Stack>
        {disponibilidad.categorias.map((line) => <Box key={line.categoriaPeso} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2, mb: 1.5 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ justifyContent: "space-between", alignItems: { sm: "center" }, mb: 1 }}><CategoryBadge codigo={line.categoriaPeso} nombre={line.nombre} /><Stack direction="row" spacing={1.5}><Typography variant="body2">Pedido: <b>{line.cantidadSolicitada}</b></Typography><Typography variant="body2">Disponible: <b>{line.cantidadDisponible}</b></Typography><Typography variant="body2" color="primary.main">Cargar: <b>{line.cantidadRecomendada}</b></Typography></Stack></Stack>
          {line.cantidadNoEntregada > 0 && <Alert severity="warning" sx={{ mb: 1.2, py: 0 }}>No hay existencia para {line.cantidadNoEntregada} bandejas de este peso. Se registrarán como no entregadas.</Alert>}
          {line.galpones.length === 0 ? <Typography variant="body2" color="text.secondary">No hay galpones con cierre disponible.</Typography> : <>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 1.2 }}>
              {line.galpones.map((barn) => <Stack key={barn.galponId} direction="row" spacing={1} sx={{ alignItems: "center", p: 1, bgcolor: "#faf9f7", borderRadius: 1.5 }}><Box sx={{ flex: 1 }}><Typography sx={{ fontWeight: 700 }}>{barn.nombre}</Typography><Typography variant="caption" color="text.secondary">Disponible: {barn.disponible} · Sugerido: {barn.recomendada}</Typography></Box><TextField size="small" type="number" label="Cargar" value={allocation[key(line.categoriaPeso, barn.galponId)] ?? barn.recomendada} onChange={(event) => changeAllocation(line.categoriaPeso, barn.galponId, Number(event.target.value))} slotProps={{ htmlInput: { min: 0, max: barn.disponible, "aria-label": `Cargar ${line.nombre} desde ${barn.nombre}` } }} sx={{ width: 112 }} /></Stack>)}
            </Box>
          </>}
        </Box>)}
        {missingPrice.length > 0 && <Alert severity="error" sx={{ mt: 1 }}>Faltan precios para: {missingPrice.map((item) => item.nombre).join(", ")}.</Alert>}
      </>}
      {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2.5 }}><Button onClick={onClose} disabled={saving}>Cancelar</Button><Button variant="contained" onClick={() => void submit()} disabled={!canSubmit || saving}>{saving ? "Guardando…" : "Confirmar carga y venta"}</Button></DialogActions>
  </Dialog>
}
