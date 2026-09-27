import Box from "@mui/material/Box"
import Chip from "@mui/material/Chip"
import Dialog from "@mui/material/Dialog"
import DialogContent from "@mui/material/DialogContent"
import DialogTitle from "@mui/material/DialogTitle"
import Divider from "@mui/material/Divider"
import Stack from "@mui/material/Stack"
import Typography from "@mui/material/Typography"
import CategoryBadge from "../../../components/atoms/CategoryBadge"
import type { Pedido } from "../types/comercial.types"

const money = (value: number) => `$${Math.round(value).toLocaleString("en-US")} COP`
const timestamp = (value: string) => new Intl.DateTimeFormat("es-CO", { dateStyle: "full", timeStyle: "short" }).format(new Date(value))
const status: Record<string, { label: string; color: "warning" | "info" | "success" | "default" }> = {
  pendiente: { label: "Pendiente de preparación", color: "warning" },
  cargado: { label: "Listo para registrar la venta", color: "info" },
  entregado: { label: "Entregado", color: "success" },
  entregado_parcial: { label: "Entrega parcial", color: "info" },
  cancelado: { label: "Cancelado", color: "default" },
}

export default function PedidoDetailsDialog({ pedido, onClose }: { pedido: Pedido | null; onClose: () => void }) {
  const saleDetails = pedido?.venta?.detalles ?? []
  const salesTotal = saleDetails.reduce((sum, row) => sum + row.cantidadVendida * Number(row.precioAplicado), 0)
  const requestedTotal = pedido?.detalles.reduce((sum, row) => sum + row.cantidadSolicitada, 0) ?? 0
  return <Dialog open={Boolean(pedido)} onClose={onClose} fullWidth maxWidth="md" slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
    <DialogTitle sx={{ pb: 0.5, fontWeight: 800 }}>Detalle del pedido #{pedido?.id}</DialogTitle>
    <DialogContent>
      {pedido && <Stack spacing={2.2} sx={{ pt: 1 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 1.2 }}>
          <Box sx={{ p: 1.6, bgcolor: "#faf5ef", borderRadius: 1.5 }}><Typography variant="caption" color="text.secondary">CLIENTE</Typography><Typography sx={{ fontWeight: 700 }}>{pedido.mayorista.nombre}</Typography><Typography variant="body2" color="text.secondary">{pedido.mayorista.ubicacion || "Ubicación no registrada"}</Typography></Box>
          <Box sx={{ p: 1.6, bgcolor: "#faf5ef", borderRadius: 1.5 }}><Typography variant="caption" color="text.secondary">ESTADO</Typography><Box sx={{ mt: 0.5 }}><Chip size="small" color={(status[pedido.estado] ?? status.pendiente).color} label={(status[pedido.estado] ?? status.pendiente).label} /></Box></Box>
          <Box sx={{ p: 1.6, bgcolor: "#faf5ef", borderRadius: 1.5 }}><Typography variant="caption" color="text.secondary">FECHA DEL PEDIDO</Typography><Typography sx={{ fontWeight: 700 }}>{timestamp(pedido.fecha)}</Typography></Box>
        </Box>
        <Box><Typography sx={{ fontWeight: 800, mb: 1 }}>Cantidades solicitadas</Typography><Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>{pedido.detalles.map((d) => <CategoryBadge key={d.codigoCategoriaPeso} codigo={d.codigoCategoriaPeso} nombre={d.categoriaPeso.nombre} cantidad={d.cantidadSolicitada} />)}</Stack><Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Total solicitado: <strong>{requestedTotal} bandejas</strong></Typography></Box>
        <Divider />
        {pedido.venta ? <Box><Typography sx={{ fontWeight: 800, mb: 1 }}>Venta registrada · #{pedido.venta.id}</Typography><Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Fecha: {timestamp(pedido.venta.fechaHora)}</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 1, px: 1.3, py: 0.8, bgcolor: "#faf5ef", borderRadius: 1 }}><Typography variant="caption" sx={{ fontWeight: 800 }}>PRESENTACIÓN</Typography><Typography variant="caption" sx={{ fontWeight: 800 }}>VENDIDO</Typography><Typography variant="caption" sx={{ fontWeight: 800, textAlign: "right" }}>PRECIO / TOTAL</Typography></Box>
          {saleDetails.map((d) => { const category = pedido.detalles.find((line) => line.codigoCategoriaPeso === d.codigoCategoriaPeso)?.categoriaPeso; return <Box key={d.codigoCategoriaPeso} sx={{ py: 1.2, borderBottom: "1px solid", borderColor: "divider" }}><Box sx={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 1, alignItems: "center" }}><CategoryBadge codigo={d.codigoCategoriaPeso} nombre={category?.nombre} /><Typography>{d.cantidadVendida} bandejas entregadas</Typography><Typography sx={{ textAlign: "right" }}>{money(Number(d.precioAplicado))} · <strong>{money(d.cantidadVendida * Number(d.precioAplicado))}</strong></Typography></Box>{d.cantidadNoEntregada > 0 && <Typography variant="body2" color="warning.dark" sx={{ mt: 0.6 }}>No entregadas: {d.cantidadNoEntregada} bandejas · Sin existencia</Typography>}{d.distribuciones.length > 0 && <Stack direction="row" spacing={0.7} sx={{ mt: 0.8, flexWrap: "wrap" }}>{d.distribuciones.map((row) => <Chip key={row.idGalpon} size="small" variant="outlined" label={`${row.galpon.nombre}: ${row.cantidad}`} />)}</Stack>}</Box> })}
          <Typography sx={{ textAlign: "right", fontWeight: 800, mt: 1 }}>Total vendido: {money(salesTotal)}</Typography>
        </Box> : <Box sx={{ p: 1.5, bgcolor: "#f8fafc", borderRadius: 1.5 }}><Typography sx={{ fontWeight: 700 }}>Aún no se ha registrado la venta.</Typography><Typography variant="body2" color="text.secondary">Cuando se cargue el pedido, aquí aparecerán las cantidades entregadas y su distribución por galpón.</Typography></Box>}
      </Stack>}
    </DialogContent>
  </Dialog>
}
