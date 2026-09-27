import { useCallback, useEffect, useMemo, useState } from "react"
import AddShoppingCartRoundedIcon from "@mui/icons-material/AddShoppingCartRounded"
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded"
import EditRoundedIcon from "@mui/icons-material/EditRounded"
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined"
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined"
import PaidOutlinedIcon from "@mui/icons-material/PaidOutlined"
import PendingActionsRoundedIcon from "@mui/icons-material/PendingActionsRounded"
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined"
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Card from "@mui/material/Card"
import Chip from "@mui/material/Chip"
import CircularProgress from "@mui/material/CircularProgress"
import Snackbar from "@mui/material/Snackbar"
import Stack from "@mui/material/Stack"
import Tab from "@mui/material/Tab"
import Table from "@mui/material/Table"
import TableBody from "@mui/material/TableBody"
import TableCell from "@mui/material/TableCell"
import TableContainer from "@mui/material/TableContainer"
import TableHead from "@mui/material/TableHead"
import TablePagination from "@mui/material/TablePagination"
import TableRow from "@mui/material/TableRow"
import Tabs from "@mui/material/Tabs"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import CategoryBadge from "../../../components/atoms/CategoryBadge"
import { useAuthStore } from "../../../stores/authStore"
import PedidoDetailsDialog from "../components/PedidoDetailsDialog"
import PedidoFormDialog from "../components/PedidoFormDialog"
import PreciosDialog from "../components/PreciosDialog"
import VentaDialog from "../components/VentaDialog"
import { createMayorista, createPedido, createVenta, getCategoriasComerciales, getMayoristas, getPedidoDisponibilidad, getPedidos, getPreciosMayorista, savePrecio, updatePedido } from "../services/comercialService"
import type { CategoriaComercial, DisponibilidadPedido, Mayorista, Pedido, PrecioMayorista } from "../types/comercial.types"

const money = (value: number) => `$${Math.round(value).toLocaleString("en-US")} COP`
const dateTime = (value: string) => new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
const status: Record<string, { label: string; color: "warning" | "info" | "success" | "default" }> = { pendiente: { label: "Pendiente", color: "warning" }, cargado: { label: "Listo para venta", color: "info" }, entregado: { label: "Entregado", color: "success" }, entregado_parcial: { label: "Entrega parcial", color: "info" }, cancelado: { label: "Cancelado", color: "default" } }

export default function ComercialPage() {
  const { role, permissions } = useAuthStore()
  const canOrder = role === "Administrador" || role === "Vendedor" || permissions.includes("INGRESAR_PEDIDO")
  const canSell = role === "Administrador" || permissions.includes("REGISTRAR_VENTA")
  const canManageClients = role === "Administrador" || permissions.includes("GESTIONAR_MAYORISTAS")
  const canEditPrices = role === "Administrador" || permissions.includes("EDITAR_PRECIOS")
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [mayoristas, setMayoristas] = useState<Mayorista[]>([])
  const [categorias, setCategorias] = useState<CategoriaComercial[]>([])
  const [precios, setPrecios] = useState<PrecioMayorista[]>([])
  const [clientPrices, setClientPrices] = useState<PrecioMayorista[]>([])
  const [priceCounts, setPriceCounts] = useState<Record<number, number>>({})
  const [orderPrices, setOrderPrices] = useState<PrecioMayorista[]>([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState("")
  const [toast, setToast] = useState("")
  const [tab, setTab] = useState(0)
  const [filter, setFilter] = useState("todos")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [clientPage, setClientPage] = useState(0)
  const [clientRowsPerPage, setClientRowsPerPage] = useState(10)
  const [orderOpen, setOrderOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<Pedido | null>(null)
  const [detailsOrder, setDetailsOrder] = useState<Pedido | null>(null)
  const [saleOrder, setSaleOrder] = useState<Pedido | null>(null)
  const [availability, setAvailability] = useState<DisponibilidadPedido | null>(null)
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [priceClient, setPriceClient] = useState<Mayorista | null>(null)

  const loadData = useCallback(async (initial = false) => {
    if (initial) setLoading(true)
    setPageError("")
    try {
      const [orders, clients, cats] = await Promise.all([getPedidos(), getMayoristas(), getCategoriasComerciales()])
      setPedidos(orders); setMayoristas(clients); setCategorias(cats)
    } catch (e) { setPageError(e instanceof Error ? e.message : "No se pudo cargar la informaciÃ³n comercial.") }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void loadData(true) }, [loadData])

  const counts = useMemo(() => ({ pending: pedidos.filter((p) => p.estado === "pendiente").length, ready: pedidos.filter((p) => p.estado === "cargado").length, delivered: pedidos.filter((p) => p.estado === "entregado" || p.estado === "entregado_parcial").length }), [pedidos])
  const deliveredSales = pedidos.filter((p) => (p.estado === "entregado" || p.estado === "entregado_parcial") && p.venta)
  const salesTotal = deliveredSales.reduce((sum, p) => sum + (p.venta?.detalles.reduce((subtotal, d) => subtotal + d.cantidadVendida * Number(d.precioAplicado), 0) ?? 0), 0)
  const soldTrays = deliveredSales.reduce((sum, p) => sum + (p.venta?.detalles.reduce((subtotal, d) => subtotal + d.cantidadVendida, 0) ?? 0), 0)
  const averageSale = deliveredSales.length ? salesTotal / deliveredSales.length : 0
  const visibleOrders = useMemo(() => pedidos.filter((p) => (filter === "todos" || (filter === "entregado" ? p.estado === "entregado" || p.estado === "entregado_parcial" : p.estado === filter)) && `${p.mayorista.nombre} ${p.id}`.toLowerCase().includes(search.toLowerCase())), [pedidos, filter, search])
  const orderRows = visibleOrders.slice(page * rowsPerPage, (page + 1) * rowsPerPage)
  const clientRows = mayoristas.slice(clientPage * clientRowsPerPage, (clientPage + 1) * clientRowsPerPage)

  const handleOrderSave = async (data: { mayoristaId: number; detalles: { categoriaPeso: string; cantidadSolicitada: number }[] }, id?: number) => {
    if (id) { await updatePedido(id, data); setClientPrices(await getPreciosMayorista(data.mayoristaId)); setToast(`Pedido #${id} actualizado.`) }
    else { await createPedido(data); setOrderPrices(await getPreciosMayorista(data.mayoristaId)); setToast("Pedido guardado.") }
    await loadData()
  }
  const addClient = async (nombre: string) => { const client = await createMayorista({ nombre }); setMayoristas((current) => [...current, client].sort((a, b) => a.nombre.localeCompare(b.nombre))); return client }
  const openPrices = async (client: Mayorista) => { setPriceClient(client); try { const current = await getPreciosMayorista(client.id); setClientPrices(current); setPriceCounts((counts) => ({ ...counts, [client.id]: current.length })) } catch (e) { setPriceClient(null); setToast(e instanceof Error ? e.message : "No se pudieron cargar los precios.") } }
  const openEditOrder = async (pedido: Pedido) => { setEditingOrder(pedido); setOrderOpen(true); try { setClientPrices(await getPreciosMayorista(pedido.idMayorista)) } catch { setClientPrices([]) } }
  const openNewOrder = async () => { setEditingOrder(null); setOrderOpen(true); if (mayoristas[0]) { try { setOrderPrices(await getPreciosMayorista(mayoristas[0].id)) } catch { setOrderPrices([]) } } }
  const loadOrderPrices = async (clientId: number) => { try { setOrderPrices(await getPreciosMayorista(clientId)) } catch { setOrderPrices([]) } }
  const savePrice = async (category: string, price: number) => { if (!priceClient) return; await savePrecio(priceClient.id, { categoriaPeso: category, valorUnitario: price }); setClientPrices(await getPreciosMayorista(priceClient.id)); setToast("Precio actualizado.") }
  const openSale = async (pedido: Pedido) => { setSaleOrder(pedido); setAvailability(null); setAvailabilityLoading(true); try { const [prices, stock] = await Promise.all([getPreciosMayorista(pedido.idMayorista), getPedidoDisponibilidad(pedido.id)]); setPrecios(prices); setAvailability(stock) } catch (e) { setAvailability(null); setToast(e instanceof Error ? e.message : "No se pudo consultar la existencia.") } finally { setAvailabilityLoading(false) } }
  const handleSale = async (data: { detalles: { categoriaPeso: string; cantidadVendida: number }[]; distribucion: { galponId: number; categoriaPeso: string; cantidad: number }[] }) => { if (!saleOrder) return; const orderId = saleOrder.id; await createVenta(orderId, data); setSaleOrder(null); setAvailability(null); await loadData(); setToast(`Carga del pedido #${orderId} registrada.`) }

  if (loading) return <Box sx={{ minHeight: 360, display: "grid", placeItems: "center" }}><CircularProgress /></Box>
  if (pageError) return <Stack spacing={2} sx={{ maxWidth: 700, mx: "auto", py: 4 }}><Alert severity="error">{pageError}</Alert><Button variant="outlined" onClick={() => void loadData(true)}>Intentar de nuevo</Button></Stack>

  const kpis = [
    { label: "Ventas registradas", value: money(salesTotal), help: `${deliveredSales.length} pedidos entregados`, icon: <PaidOutlinedIcon />, color: "#e8f5e9" },
    { label: "Bandejas vendidas", value: soldTrays.toLocaleString("en-US"), help: "Total despachado", icon: <Inventory2OutlinedIcon />, color: "#e8f3fb" },
    { label: "Promedio por venta", value: money(averageSale), help: "Valor promedio por pedido", icon: <ShoppingBagOutlinedIcon />, color: "#f4eafa" },
    { label: "Por preparar", value: counts.pending.toLocaleString("en-US"), help: "Pedidos recibidos", icon: <PendingActionsRoundedIcon />, color: "#fff2dc", state: "pendiente" },
    { label: "Listos para entregar", value: counts.ready.toLocaleString("en-US"), help: "Falta registrar la venta", icon: <LocalShippingOutlinedIcon />, color: "#e8f3fb", state: "cargado" },
    { label: "Clientes mayoristas", value: mayoristas.length.toLocaleString("en-US"), help: `${counts.delivered} pedidos entregados`, icon: <ShoppingBagOutlinedIcon />, color: "#fff2ec" },
  ]

  return <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" } }}><Box><Typography variant="h4" sx={{ fontSize: { xs: "1.7rem", sm: "2rem" }, mb: 0.5 }}>Pedidos y ventas</Typography><Typography color="text.secondary">Todo el trabajo comercial, paso a paso.</Typography></Box>{canOrder && <Button variant="contained" startIcon={<AddShoppingCartRoundedIcon />} onClick={() => void openNewOrder()}>Nuevo pedido</Button>}</Stack>
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }, gap: 1.5 }}>{kpis.map((kpi) => <Card key={kpi.label} elevation={0} onClick={kpi.state ? () => { setFilter(kpi.state!); setTab(0); setPage(0) } : undefined} sx={{ border: "1px solid", borderColor: "divider", boxShadow: "none", cursor: kpi.state ? "pointer" : "default" }}><Box sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}><Box><Typography variant="body2" color="text.secondary"sx={{ fontWeight: 700 }}>{kpi.label}</Typography><Typography variant="h5" sx={{ my: 0.5, fontWeight: 800 }}>{kpi.value}</Typography><Typography variant="caption" color="text.secondary">{kpi.help}</Typography></Box><Box sx={{ display: "grid", placeItems: "center", width: 44, height: 44, borderRadius: 2, bgcolor: kpi.color }}>{kpi.icon}</Box></Box></Card>)}</Box>

    <Box sx={{ mt: 1 }}>
    <Box sx={{ borderBottom: "1px solid", borderColor: "divider", mb: 2 }}><Tabs value={tab} onChange={(_, value) => { setTab(value); setPage(0) }} textColor="primary" indicatorColor="primary" sx={{ "& .MuiTab-root": { textTransform: "none", fontWeight: 700, fontSize: "0.95rem", minHeight: 44, px: 2 } }}><Tab icon={<ShoppingBagOutlinedIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Pedidos" /><Tab icon={<PaidOutlinedIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Clientes y precios" /></Tabs></Box>
    <Card elevation={0} sx={{ borderRadius: 1.5, border: "1px solid", borderColor: "divider", backgroundColor: "background.paper", overflow: "hidden" }}>
      {tab === 0 && <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 1.5 }}><Box><Typography variant="h6" sx={{ fontWeight: 800, color: "text.primary", fontSize: "1.1rem" }}>Pedidos registrados</Typography><Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.825rem" }}>{visibleOrders.length} pedidos para consultar y gestionar.</Typography></Box><Box sx={{ display: "flex", flexDirection: "column", alignItems: { xs: "stretch", sm: "flex-end" }, gap: 1, width: { xs: "100%", sm: "min(100%, 460px)" } }}><TextField size="small" placeholder="Buscar cliente o pedido" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0) }} sx={{ width: "100%", "& .MuiInputBase-root": { minHeight: 38, borderRadius: 1, bgcolor: "#ffffff", fontSize: "0.85rem" } }} /><Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", justifyContent: { xs: "flex-start", sm: "flex-end" }, rowGap: 1 }}>{[{ id: "todos", label: "Todos" }, { id: "pendiente", label: "Pendientes" }, { id: "cargado", label: "Por entregar" }, { id: "entregado", label: "Entregados" }, { id: "entregado_parcial", label: "Parciales" }].map((item) => <Chip key={item.id} label={item.label} onClick={() => { setFilter(item.id); setPage(0) }} variant={filter === item.id ? "filled" : "outlined"} color={filter === item.id ? "primary" : "default"} />)}</Stack></Box></Box>}
      {tab === 0 ? <>
        <TableContainer><Table sx={{ minWidth: 900 }} aria-label="Tabla de pedidos"><TableHead sx={{ bgcolor: "#faf7f2" }}><TableRow><TableCell sx={{ fontWeight: 800 }}>PEDIDO / FECHA</TableCell><TableCell sx={{ fontWeight: 800 }}>CLIENTE</TableCell><TableCell sx={{ fontWeight: 800 }}>PRESENTACIONES</TableCell><TableCell align="center" sx={{ fontWeight: 800 }}>BANDEJAS</TableCell><TableCell sx={{ fontWeight: 800 }}>ESTADO</TableCell><TableCell align="right" sx={{ fontWeight: 800 }}>TOTAL VENTA</TableCell><TableCell align="center" sx={{ fontWeight: 800 }}>ACCIONES</TableCell></TableRow></TableHead><TableBody>
          {orderRows.length === 0 ? <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6 }}><Typography sx={{ fontWeight: 700 }}>{pedidos.length === 0 ? "AÃºn no hay pedidos" : "No hay pedidos para mostrar"}</Typography><Typography variant="body2" color="text.secondary">{pedidos.length === 0 ? "Crea un pedido para empezar." : "Cambia el filtro o la bÃºsqueda."}</Typography></TableCell></TableRow> : orderRows.map((pedido) => { const saleAmount = pedido.venta?.detalles.reduce((sum, detail) => sum + detail.cantidadVendida * Number(detail.precioAplicado), 0); const state = status[pedido.estado] ?? status.pendiente; return <TableRow key={pedido.id} hover><TableCell><Typography sx={{ fontWeight: 800 }}>#{pedido.id}</Typography><Typography variant="caption" color="text.secondary">{dateTime(pedido.fecha)}</Typography></TableCell><TableCell><Typography sx={{ fontWeight: 700 }}>{pedido.mayorista.nombre}</Typography></TableCell><TableCell><Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap" }}>{pedido.detalles.slice(0, 4).map((d) => <CategoryBadge key={d.codigoCategoriaPeso} codigo={d.codigoCategoriaPeso} nombre={d.categoriaPeso.nombre} cantidad={d.cantidadSolicitada} />)}{pedido.detalles.length > 4 && <Chip size="small" label={`+${pedido.detalles.length - 4}`} />}</Stack></TableCell><TableCell align="center" sx={{ fontWeight: 800 }}>{pedido.detalles.reduce((sum, d) => sum + d.cantidadSolicitada, 0).toLocaleString("en-US")}</TableCell><TableCell><Chip size="small" color={state.color} label={state.label} /></TableCell><TableCell align="right" sx={{ fontWeight: 700 }}>{saleAmount === undefined ? "â€”" : money(saleAmount)}</TableCell><TableCell align="center"><Stack direction="row" spacing={0.5} sx={{ justifyContent: "center" }}><Button size="small" startIcon={<VisibilityRoundedIcon />} onClick={() => setDetailsOrder(pedido)}>Detalle</Button>{pedido.estado === "pendiente" && canOrder && <Button size="small" aria-label={`Editar pedido ${pedido.id}`} onClick={() => void openEditOrder(pedido)}><EditRoundedIcon fontSize="small" /></Button>}{(pedido.estado === "pendiente" || pedido.estado === "cargado") && canSell && <Button size="small" variant="contained" onClick={() => void openSale(pedido)}>Cargar pedido</Button>}</Stack></TableCell></TableRow> })}
        </TableBody></Table></TableContainer><TablePagination component="div" rowsPerPageOptions={[10, 25, 50]} count={visibleOrders.length} rowsPerPage={rowsPerPage} page={page} onPageChange={(_, value) => setPage(value)} onRowsPerPageChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0) }} labelRowsPerPage="Filas por pÃ¡gina:" labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`} sx={{ borderTop: "1px solid", borderColor: "divider" }} />
      </> : <>
        <Box sx={{ p: { xs: 2, sm: 3 }, borderTop: "1px solid", borderColor: "divider" }}><Typography variant="h6"sx={{ fontWeight: 800 }}>Clientes mayoristas</Typography><Typography color="text.secondary" sx={{ mt: 0.4, mb: 2 }}>Precios por cliente y presentaciÃ³n, usados para calcular las ventas.</Typography></Box>
        <TableContainer><Table sx={{ minWidth: 650 }} aria-label="Tabla de clientes mayoristas"><TableHead sx={{ bgcolor: "#faf7f2" }}><TableRow><TableCell sx={{ fontWeight: 800 }}>CLIENTE</TableCell><TableCell sx={{ fontWeight: 800 }}>UBICACIÃ“N</TableCell><TableCell sx={{ fontWeight: 800 }}>CONTACTO</TableCell><TableCell align="center" sx={{ fontWeight: 800 }}>PRECIOS</TableCell><TableCell align="center" sx={{ fontWeight: 800 }}>ACCIONES</TableCell></TableRow></TableHead><TableBody>{clientRows.length === 0 ? <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5 }}>No hay clientes registrados.</TableCell></TableRow> : clientRows.map((client) => { const contact = client.contacto?.telefono; return <TableRow key={client.id} hover><TableCell sx={{ fontWeight: 700 }}>{client.nombre}</TableCell><TableCell>{client.ubicacion || "â€”"}</TableCell><TableCell>{typeof contact === "string" ? contact : "â€”"}</TableCell><TableCell align="center">{priceCounts[client.id] ?? "Sin consultar"}</TableCell><TableCell align="center">{canEditPrices && <Button size="small" onClick={() => void openPrices(client)}>Ver y editar precios</Button>}</TableCell></TableRow> })}</TableBody></Table></TableContainer><TablePagination component="div" rowsPerPageOptions={[10, 25, 50]} count={mayoristas.length} rowsPerPage={clientRowsPerPage} page={clientPage} onPageChange={(_, value) => setClientPage(value)} onRowsPerPageChange={(e) => { setClientRowsPerPage(Number(e.target.value)); setClientPage(0) }} labelRowsPerPage="Filas por pÃ¡gina:" labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`} sx={{ borderTop: "1px solid", borderColor: "divider" }} />
      </>}
    </Card>
    </Box>
    <PedidoFormDialog open={orderOpen} pedido={editingOrder} mayoristas={mayoristas} categorias={categorias} precios={editingOrder ? clientPrices : orderPrices} onClienteChange={loadOrderPrices} onClose={() => { setOrderOpen(false); setEditingOrder(null) }} onSave={handleOrderSave} onCreateMayorista={canManageClients ? addClient : undefined} />
    <PedidoDetailsDialog pedido={detailsOrder} onClose={() => setDetailsOrder(null)} />
    <VentaDialog pedido={saleOrder} disponibilidad={availability} loading={availabilityLoading} precios={precios} onClose={() => { setSaleOrder(null); setAvailability(null) }} onSave={handleSale} />
    <PreciosDialog cliente={priceClient} categorias={categorias} precios={clientPrices} onClose={() => setPriceClient(null)} onSave={savePrice} />
    <Snackbar open={Boolean(toast)} autoHideDuration={4500} onClose={() => setToast("")} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}><Alert severity="success" variant="filled" onClose={() => setToast("")}>{toast}</Alert></Snackbar>
  </Box>
}



