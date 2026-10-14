import { useCallback, useEffect, useState } from "react";
import ModuleTabs from "../../../components/molecules/ModuleTabs";
import AddShoppingCartRoundedIcon from "@mui/icons-material/AddShoppingCartRounded";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useAuthStore } from "../../auth/stores/authStore";
import CommercialKpiCards from "../components/CommercialKpiCards";
import PedidosTable from "../components/PedidosTable";
import ClientesTable from "../components/ClientesTable";
import PedidoDetailsDialog from "../components/PedidoDetailsDialog";
import PedidoFormDialog from "../components/PedidoFormDialog";
import PreciosDialog from "../components/PreciosDialog";
import VentaDialog from "../components/VentaDialog";
import {
  createMayorista,
  createPedido,
  createVenta,
  getCategoriasComerciales,
  getMayoristas,
  getPedidoDisponibilidad,
  getPedidos,
  getPreciosMayorista,
  savePrecio,
  updatePedido,
} from "../services/comercialService";
import type {
  CategoriaComercial,
  DisponibilidadPedido,
  Mayorista,
  Pedido,
  PrecioMayorista,
} from "../types/comercial.types";

export default function ComercialPage() {
  const { role, permissions } = useAuthStore();
  const canOrder =
    role === "Administrador" ||
    role === "Vendedor" ||
    permissions.includes("INGRESAR_PEDIDO");
  const canSell =
    role === "Administrador" || permissions.includes("REGISTRAR_VENTA");
  const canManageClients =
    role === "Administrador" || permissions.includes("GESTIONAR_MAYORISTAS");
  const canEditPrices =
    role === "Administrador" || permissions.includes("EDITAR_PRECIOS");
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [mayoristas, setMayoristas] = useState<Mayorista[]>([]);
  const [categorias, setCategorias] = useState<CategoriaComercial[]>([]);
  const [precios, setPrecios] = useState<PrecioMayorista[]>([]);
  const [clientPrices, setClientPrices] = useState<PrecioMayorista[]>([]);
  const [priceCounts, setPriceCounts] = useState<Record<number, number>>({});
  const [orderPrices, setOrderPrices] = useState<PrecioMayorista[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [toast, setToast] = useState("");
  const [tab, setTab] = useState(0);
  const [filter, setFilter] = useState("todos");
  const [orderOpen, setOrderOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Pedido | null>(null);
  const [detailsOrder, setDetailsOrder] = useState<Pedido | null>(null);
  const [saleOrder, setSaleOrder] = useState<Pedido | null>(null);
  const [availability, setAvailability] = useState<DisponibilidadPedido | null>(
    null,
  );
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [priceClient, setPriceClient] = useState<Mayorista | null>(null);

  const loadData = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    setPageError("");
    try {
      const [orders, clients, cats] = await Promise.all([
        getPedidos(),
        getMayoristas(),
        getCategoriasComerciales(),
      ]);
      setPedidos(orders);
      setMayoristas(clients);
      setCategorias(cats);
    } catch (e) {
      setPageError(
        e instanceof Error
          ? e.message
          : "No se pudo cargar la información comercial.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void loadData(true);
  }, [loadData]);

  const handleOrderSave = async (
    data: {
      mayoristaId: number;
      detalles: { categoriaPeso: string; cantidadSolicitada: number }[];
    },
    id?: number,
  ) => {
    if (id) {
      await updatePedido(id, data);
      setClientPrices(await getPreciosMayorista(data.mayoristaId));
      setToast(`Pedido #${id} actualizado.`);
    } else {
      await createPedido(data);
      setOrderPrices(await getPreciosMayorista(data.mayoristaId));
      setToast("Pedido guardado.");
    }
    await loadData();
  };
  const addClient = async (nombre: string) => {
    const client = await createMayorista({ nombre });
    setMayoristas((current) =>
      [...current, client].sort((a, b) => a.nombre.localeCompare(b.nombre)),
    );
    return client;
  };
  const openPrices = async (client: Mayorista) => {
    setPriceClient(client);
    try {
      const current = await getPreciosMayorista(client.id);
      setClientPrices(current);
      setPriceCounts((counts) => ({ ...counts, [client.id]: current.length }));
    } catch (e) {
      setPriceClient(null);
      setToast(
        e instanceof Error ? e.message : "No se pudieron cargar los precios.",
      );
    }
  };
  const openEditOrder = async (pedido: Pedido) => {
    setEditingOrder(pedido);
    setOrderOpen(true);
    try {
      setClientPrices(await getPreciosMayorista(pedido.idMayorista));
    } catch {
      setClientPrices([]);
    }
  };
  const openNewOrder = async () => {
    setEditingOrder(null);
    setOrderOpen(true);
    if (mayoristas[0]) {
      try {
        setOrderPrices(await getPreciosMayorista(mayoristas[0].id));
      } catch {
        setOrderPrices([]);
      }
    }
  };
  const loadOrderPrices = async (clientId: number) => {
    try {
      setOrderPrices(await getPreciosMayorista(clientId));
    } catch {
      setOrderPrices([]);
    }
  };
  const savePrice = async (category: string, price: number) => {
    if (!priceClient) return;
    await savePrecio(priceClient.id, {
      categoriaPeso: category,
      valorUnitario: price,
    });
    setClientPrices(await getPreciosMayorista(priceClient.id));
    setPriceCounts((counts) => ({
      ...counts,
      [priceClient.id]: (counts[priceClient.id] ?? 0) + 1,
    }));
    setToast("Precio actualizado.");
  };
  const openSale = async (pedido: Pedido) => {
    setSaleOrder(pedido);
    setAvailability(null);
    setAvailabilityLoading(true);
    try {
      const [prices, stock] = await Promise.all([
        getPreciosMayorista(pedido.idMayorista),
        getPedidoDisponibilidad(pedido.id),
      ]);
      setPrecios(prices);
      setAvailability(stock);
    } catch (e) {
      setAvailability(null);
      setToast(
        e instanceof Error ? e.message : "No se pudo consultar la existencia.",
      );
    } finally {
      setAvailabilityLoading(false);
    }
  };
  const handleSale = async (data: {
    detalles: { categoriaPeso: string; cantidadVendida: number }[];
    distribucion: {
      galponId: number;
      categoriaPeso: string;
      cantidad: number;
    }[];
  }) => {
    if (!saleOrder) return;
    const orderId = saleOrder.id;
    await createVenta(orderId, data);
    setSaleOrder(null);
    setAvailability(null);
    await loadData();
    setToast(`Carga del pedido #${orderId} registrada.`);
  };

  if (loading)
    return (
      <Box sx={{ minHeight: 360, display: "grid", placeItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  if (pageError)
    return (
      <Stack spacing={2} sx={{ maxWidth: 700, mx: "auto", py: 4 }}>
        <Alert severity="error">{pageError}</Alert>
        <Button variant="outlined" onClick={() => void loadData(true)}>
          Intentar de nuevo
        </Button>
      </Stack>
    );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{
          justifyContent: "space-between",
          alignItems: { xs: "stretch", sm: "center" },
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{ fontSize: { xs: "1.7rem", sm: "2rem" }, mb: 0.5 }}
          >
            Pedidos y ventas
          </Typography>
          <Typography color="text.secondary">
            Todo el trabajo comercial, paso a paso.
          </Typography>
        </Box>
        {canOrder && (
          <Button
            variant="contained"
            startIcon={<AddShoppingCartRoundedIcon />}
            onClick={() => void openNewOrder()}
          >
            Nuevo pedido
          </Button>
        )}
      </Stack>

      {/* EXECUTIVE KPIS */}
      <CommercialKpiCards
        pedidos={pedidos}
        mayoristas={mayoristas}
        onSelectFilter={(selectedFilter) => {
          setFilter(selectedFilter);
          setTab(0);
        }}
      />

      {/* TABS & DATA TABLES SECTION */}
      <Box sx={{ mt: 1 }}>
        <ModuleTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { label: "Pedidos", icon: <ShoppingBagOutlinedIcon sx={{ fontSize: 18 }} /> },
            { label: "Clientes", icon: <PeopleAltOutlinedIcon sx={{ fontSize: 18 }} /> },
          ]}
        />

        {/* Tab 0: Pedidos */}
        {tab === 0 && (
          <PedidosTable
            pedidos={pedidos}
            canOrder={canOrder}
            canSell={canSell}
            onOpenDetails={setDetailsOrder}
            onOpenEdit={(pedido) => void openEditOrder(pedido)}
            onOpenSale={(pedido) => void openSale(pedido)}
            filter={filter}
            onFilterChange={setFilter}
          />
        )}

        {/* Tab 1: Clientes */}
        {tab === 1 && (
          <ClientesTable
            mayoristas={mayoristas}
            pedidos={pedidos}
            canEditPrices={canEditPrices}
            onOpenPrices={(cliente) => void openPrices(cliente)}
            priceCounts={priceCounts}
          />
        )}

      </Box>
      <PedidoFormDialog
        open={orderOpen}
        pedido={editingOrder}
        mayoristas={mayoristas}
        categorias={categorias}
        precios={editingOrder ? clientPrices : orderPrices}
        onClienteChange={loadOrderPrices}
        onClose={() => {
          setOrderOpen(false);
          setEditingOrder(null);
        }}
        onSave={handleOrderSave}
        onCreateMayorista={canManageClients ? addClient : undefined}
      />
      <PedidoDetailsDialog
        pedido={detailsOrder}
        onClose={() => setDetailsOrder(null)}
      />
      <VentaDialog
        pedido={saleOrder}
        disponibilidad={availability}
        loading={availabilityLoading}
        precios={precios}
        onClose={() => {
          setSaleOrder(null);
          setAvailability(null);
        }}
        onSave={handleSale}
      />
      <PreciosDialog
        cliente={priceClient}
        categorias={categorias}
        precios={clientPrices}
        onClose={() => setPriceClient(null)}
        onSave={savePrice}
      />
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4500}
        onClose={() => setToast("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity="success" variant="filled" onClose={() => setToast("")}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  );
}
