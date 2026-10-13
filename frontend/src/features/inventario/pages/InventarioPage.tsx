import { getGalpones } from "../../galpones/services/galponesService";
import ModuleTabs from "../../../components/molecules/ModuleTabs";
import type { GalponResumen } from "../../galpones/types/galpones.types";
import { useCallback, useEffect, useMemo, useState } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import StoreRoundedIcon from "@mui/icons-material/StoreRounded";
import SwapVertRoundedIcon from "@mui/icons-material/SwapVertRounded";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import FeedbackAlert from "../../../components/organisms/FeedbackAlert";
import {
  createCompra,
  createInsumo,
  createMovimiento,
  createProveedor,
  deleteInsumo,
  deleteProveedor,
  downloadReceipt,
  getCompras,
  getInsumos,
  getProveedores,
  getStock,
  getStockMovements,
  setInsumoActive,
  setProveedorActive,
  updateInsumo,
  updateProveedor,
} from "../services/inventarioService";
import type {
  Compra,
  Insumo,
  Movimiento,
  Proveedor,
  StockInsumo,
} from "../types/inventario.types";
import {
  emptyInsumo,
  emptyLine,
  emptyMovement,
  emptyProvider,
  type InsumoForm,
  type MovementForm,
  type ProviderForm,
  type PurchaseLine,
} from "../types/inventarioForms";
import ComprasTable from "../components/ComprasTable";
import CompraDetailsDialog from "../components/CompraDetailsDialog";
import { todayBogota } from "../utils/inventarioFormat";
import DeleteConfirmationDialog from "../components/DeleteConfirmationDialog";
import InsumoDialog from "../components/InsumoDialog";
import InventarioKpiCards from "../components/InventarioKpiCards";
import KardexDialog from "../components/KardexDialog";
import MovementDialog from "../components/MovementDialog";
import MovimientosView from "../components/MovimientosView";
import ProveedoresView from "../components/ProveedoresView";
import ProviderDialog from "../components/ProviderDialog";
import PurchaseDialog from "../components/PurchaseDialog";
import StockTable from "../components/StockTable";

type DialogName =
  | "insumo"
  | "proveedor"
  | "compra"
  | "movimiento"
  | "kardex"
  | null;
type ToastSeverity = "success" | "error";
type DeleteTarget = { type: "insumo" | "proveedor"; id: number; name: string };

export default function InventarioPage() {
  const [tab, setTab] = useState(0);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [stock, setStock] = useState<StockInsumo[]>([]);
  const [providers, setProviders] = useState<Proveedor[]>([]);
  const [galpones, setGalpones] = useState<GalponResumen[]>([]);
  const [purchases, setPurchases] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [toast, setToast] = useState("");
  const [toastSeverity, setToastSeverity] = useState<ToastSeverity>("success");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [dialog, setDialog] = useState<DialogName>(null);
  const [selectedInsumo, setSelectedInsumo] = useState<StockInsumo | null>(
    null,
  );
  const [movements, setMovements] = useState<Movimiento[]>([]);
  const [insumoForm, setInsumoForm] = useState<InsumoForm>(emptyInsumo);
  const [providerForm, setProviderForm] = useState<ProviderForm>(emptyProvider);
  const [purchaseLines, setPurchaseLines] = useState<PurchaseLine[]>([
    { ...emptyLine },
  ]);
  const [purchaseProvider, setPurchaseProvider] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(todayBogota());
  const [purchaseInvoice, setPurchaseInvoice] = useState("");
  const [purchaseNotes, setPurchaseNotes] = useState("");
  const [receipt, setReceipt] = useState<File | undefined>();
  const [receiptError, setReceiptError] = useState("");
  const [detailsPurchase, setDetailsPurchase] = useState<Compra | null>(null);
  const [savingInsumo, setSavingInsumo] = useState(false);
  const [savingProvider, setSavingProvider] = useState(false);
  const [savingPurchase, setSavingPurchase] = useState(false);
  const [savingMovement, setSavingMovement] = useState(false);
  const [movementForm, setMovementForm] = useState<MovementForm>(emptyMovement);
  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);

  const loadData = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    setPageError("");
    try {
      const [items, stockItems, providerItems, purchasesPage, galponItems] =
        await Promise.all([
          getInsumos(),
          getStock(),
          getProveedores(),
          getCompras(),
          getGalpones(),
        ]);
      setInsumos(items);
      setStock(stockItems);
      setProviders(providerItems);
      setPurchases(purchasesPage.items);
      setGalpones(galponItems);
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "No se pudo cargar el inventario.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData(true);
  }, [loadData]);

  const critical = useMemo(
    () =>
      stock.filter(
        (item) => item.activo && Number(item.stock) <= Number(item.stockMinimo),
      ),
    [stock],
  );
  const totalValue = useMemo(
    () => stock.reduce((sum, item) => sum + Number(item.valorInventario), 0),
    [stock],
  );
  const filteredStock = useMemo(
    () =>
      stock.filter((item) => {
        const matchesState = !activeOnly || item.activo;
        const needle = search.toLowerCase();
        return (
          matchesState &&
          `${item.codigo} ${item.nombre} ${item.unidadMedida}`
            .toLowerCase()
            .includes(needle)
        );
      }),
    [activeOnly, search, stock],
  );

  const closeDialog = () => {
    setDialog(null);
    setSelectedInsumo(null);
  };
  const showToast = (message: string, severity: ToastSeverity = "success") => {
    setToastSeverity(severity);
    setToast(message);
  };
  const notify = (message: string) => {
    showToast(message);
    void loadData();
  };

  const openNewInsumo = () => {
    setInsumoForm({ ...emptyInsumo });
    setDialog("insumo");
  };
  const openEditInsumo = (item: Insumo) => {
    setInsumoForm({
      id: item.id,
      codigo: item.codigo,
      nombre: item.nombre,
      unidadMedida: item.unidadMedida,
      stockMinimo: String(item.stockMinimo),
      costo: String(item.costo),
      descripcion: item.descripcion ?? "",
    });
    setDialog("insumo");
  };
  const saveInsumo = async () => {
    const data = {
      codigo: insumoForm.codigo,
      nombre: insumoForm.nombre,
      unidadMedida: insumoForm.unidadMedida,
      stockMinimo: Number(insumoForm.stockMinimo || 0),
      costo: Number(insumoForm.costo || 0),
      descripcion: insumoForm.descripcion || undefined,
    };
    setSavingInsumo(true);
    try {
      if (insumoForm.id) {
        await updateInsumo(insumoForm.id, data);
        notify("Insumo actualizado.");
      } else {
        await createInsumo(data);
        notify("Insumo creado.");
      }
      closeDialog();
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el insumo.",
        "error",
      );
    } finally {
      setSavingInsumo(false);
    }
  };

  const openNewProvider = () => {
    setProviderForm({ ...emptyProvider });
    setDialog("proveedor");
  };
  const openEditProvider = (provider: Proveedor) => {
    const contact = provider.contacto ?? {};
    setProviderForm({
      id: provider.id,
      nombre: provider.nombre,
      telefono: String(contact.telefono ?? ""),
      email: String(contact.email ?? ""),
      direccion: String(contact.direccion ?? ""),
    });
    setDialog("proveedor");
  };
  const saveProvider = async () => {
    const data = {
      nombre: providerForm.nombre,
      contacto: {
        telefono: providerForm.telefono,
        email: providerForm.email,
        direccion: providerForm.direccion,
      },
    };
    setSavingProvider(true);
    try {
      if (providerForm.id) {
        await updateProveedor(providerForm.id, data);
        notify("Proveedor actualizado.");
      } else {
        await createProveedor(data);
        notify("Proveedor creado.");
      }
      closeDialog();
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el proveedor.",
        "error",
      );
    } finally {
      setSavingProvider(false);
    }
  };

  const openPurchase = () => {
    setPurchaseProvider(providers[0] ? String(providers[0].id) : "");
    setPurchaseLines([{ ...emptyLine }]);
    setPurchaseDate(todayBogota());
    setPurchaseInvoice("");
    setPurchaseNotes("");
    setReceipt(undefined);
    setReceiptError("");
    setDialog("compra");
  };
  const purchaseTotal = purchaseLines.reduce(
    (sum, line) =>
      sum + Number(line.cantidad || 0) * Number(line.costoUnitario || 0),
    0,
  );
  const savePurchase = async () => {
    setSavingPurchase(true);
    try {
      await createCompra(
        {
          fecha: purchaseDate,
          proveedorId: Number(purchaseProvider),
          numeroFactura: purchaseInvoice || undefined,
          observaciones: purchaseNotes || undefined,
          total: purchaseTotal,
          detalles: purchaseLines.map((line) => ({
            insumoId: Number(line.insumoId),
            cantidad: Number(line.cantidad),
            costoUnitario: Number(line.costoUnitario),
            lote: line.lote || undefined,
            fechaVencimiento: line.fechaVencimiento || undefined,
          })),
        },
        receipt,
      );
      notify("Compra registrada y stock actualizado.");
      closeDialog();
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "No se pudo registrar la compra.",
        "error",
      );
    } finally {
      setSavingPurchase(false);
    }
  };

  const openMovement = () => {
    setMovementForm({ ...emptyMovement });
    setDialog("movimiento");
  };
  const saveMovement = async () => {
    setSavingMovement(true);
    try {
      await createMovimiento({
        codigoTipoMovimiento: movementForm.codigoTipoMovimiento,
        insumoId: Number(movementForm.insumoId),
        galponId: movementForm.galponId
          ? Number(movementForm.galponId)
          : undefined,
        cantidad: Number(movementForm.cantidad),
        costoUnitario: movementForm.costoUnitario
          ? Number(movementForm.costoUnitario)
          : undefined,
        observaciones: movementForm.observaciones || undefined,
      });
      notify("Movimiento registrado.");
      closeDialog();
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "No se pudo registrar el movimiento.",
        "error",
      );
    } finally {
      setSavingMovement(false);
    }
  };

  const openKardex = async (item: StockInsumo, inline = false) => {
    setSelectedInsumo(item);
    if (inline) setTab(1);
    else setDialog("kardex");
    try {
      setMovements((await getStockMovements(item.id)).items);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "No se pudo cargar el kardex.",
        "error",
      );
    }
  };

  const openReceipt = async (purchase: Compra) => {
    try {
      const blob = await downloadReceipt(purchase.id);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "No se pudo abrir el recibo.",
        "error",
      );
    }
  };

  const handleToggleInsumo = async (item: StockInsumo) => {
    try {
      await setInsumoActive(item.id, !item.activo);
      notify(item.activo ? "Insumo desactivado." : "Insumo activado.");
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "No se pudo cambiar el estado del insumo.",
        "error",
      );
    }
  };

  const handleDeleteInsumo = async (item: StockInsumo) => {
    setDeleteTarget({ type: "insumo", id: item.id, name: item.nombre });
  };

  const confirmDelete = async () => {
    const target = deleteTarget;
    if (!target) return;
    setDeleteTarget(null);
    try {
      if (target.type === "insumo") {
        await deleteInsumo(target.id);
        notify("Insumo eliminado permanentemente.");
      }
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el insumo.",
        "error",
      );
    }
  };

  const handleToggleProvider = async (provider: Proveedor) => {
    try {
      await setProveedorActive(provider.id, !provider.activo);
      notify(
        provider.activo ? "Proveedor desactivado." : "Proveedor activado.",
      );
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "No se pudo cambiar el estado del proveedor.",
        "error",
      );
    }
  };

  const handleDeleteProvider = async (provider: Proveedor) => {
    setDeleteTarget({
      type: "proveedor",
      id: provider.id,
      name: provider.nombre,
    });
  };

  const confirmProviderDelete = async () => {
    const target = deleteTarget;
    if (!target || target.type !== "proveedor") return;
    setDeleteTarget(null);
    try {
      await deleteProveedor(target.id);
      notify("Proveedor eliminado permanentemente.");
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el proveedor.",
        "error",
      );
    }
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
            Inventario
          </Typography>
          <Typography color="text.secondary">
            Existencias, compras y proveedores de la bodega.
          </Typography>
        </Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Button
            variant="outlined"
            startIcon={<SwapVertRoundedIcon />}
            onClick={openMovement}
          >
            Registrar movimiento
          </Button>
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={openPurchase}
          >
            Registrar compra
          </Button>
        </Stack>
      </Stack>

      <InventarioKpiCards
        stock={stock}
        critical={critical}
        totalValue={totalValue}
      />

      {critical.length > 0 && (
        <FeedbackAlert severity="warning">
          <Typography sx={{ fontWeight: 700 }}>
            Hay {critical.length} {critical.length === 1 ? "insumo" : "insumos"}{" "}
            bajo mínimo
          </Typography>
          <Typography variant="body2" component="div">
            Revisa las existencias con estado{" "}
            <Chip size="small" label="Bajo" color="warning" /> y programa una
            compra.
          </Typography>
        </FeedbackAlert>
      )}

      <Box sx={{ mt: 1 }}>
        <ModuleTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { label: "Existencias", icon: <Inventory2RoundedIcon sx={{ fontSize: 18 }} /> },
            { label: "Movimientos", icon: <SwapVertRoundedIcon sx={{ fontSize: 18 }} /> },
            { label: "Compras", icon: <ReceiptLongRoundedIcon sx={{ fontSize: 18 }} /> },
            { label: "Proveedores", icon: <StoreRoundedIcon sx={{ fontSize: 18 }} /> },
          ]}
        />

        {tab === 0 && (
          <StockTable
            items={filteredStock}
            totalCount={stock.length}
            search={search}
            activeOnly={activeOnly}
            onSearchChange={setSearch}
            onActiveOnlyChange={setActiveOnly}
            onNew={openNewInsumo}
            onEdit={(item) =>
              openEditInsumo(
                insumos.find((candidate) => candidate.id === item.id) ??
                  ({ ...item, descripcion: null } as Insumo),
              )
            }
            onKardex={(item) => void openKardex(item)}
            onToggle={handleToggleInsumo}
            onDelete={handleDeleteInsumo}
          />
        )}
        {tab === 1 && (
          <MovimientosView
            stock={stock}
            movements={movements}
            selected={selectedInsumo}
            onSelect={(item) => void openKardex(item, true)}
            onNew={openMovement}
          />
        )}
        {tab === 2 && (
          <ComprasTable
            purchases={purchases}
            onNew={openPurchase}
            onDetails={setDetailsPurchase}
            onReceipt={(purchase) => void openReceipt(purchase)}
          />
        )}
        {tab === 3 && (
          <ProveedoresView
            providers={providers}
            onNew={openNewProvider}
            onEdit={openEditProvider}
            onToggle={handleToggleProvider}
            onDelete={handleDeleteProvider}
          />
        )}
      </Box>

      <InsumoDialog
        open={dialog === "insumo"}
        form={insumoForm}
        setForm={setInsumoForm}
        saving={savingInsumo}
        onClose={closeDialog}
        onSave={() => void saveInsumo()}
      />
      <ProviderDialog
        open={dialog === "proveedor"}
        form={providerForm}
        setForm={setProviderForm}
        saving={savingProvider}
        onClose={closeDialog}
        onSave={() => void saveProvider()}
      />
      <PurchaseDialog
        open={dialog === "compra"}
        providers={providers.filter((provider) => provider.activo)}
        insumos={insumos.filter((item) => item.activo)}
        provider={purchaseProvider}
        setProvider={setPurchaseProvider}
        date={purchaseDate}
        setDate={setPurchaseDate}
        invoice={purchaseInvoice}
        setInvoice={setPurchaseInvoice}
        notes={purchaseNotes}
        setNotes={setPurchaseNotes}
        lines={purchaseLines}
        setLines={setPurchaseLines}
        total={purchaseTotal}
        receipt={receipt}
        setReceipt={setReceipt}
        receiptError={receiptError}
        setReceiptError={setReceiptError}
        saving={savingPurchase}
        onClose={closeDialog}
        onSave={() => void savePurchase()}
      />
      <MovementDialog
        open={dialog === "movimiento"}
        stock={stock.filter((item) => item.activo)}
        galpones={galpones.filter((item) => item.estado === "activo")}
        form={movementForm}
        setForm={setMovementForm}
        saving={savingMovement}
        onClose={closeDialog}
        onSave={() => void saveMovement()}
      />
      <CompraDetailsDialog
        purchase={detailsPurchase}
        onClose={() => setDetailsPurchase(null)}
        onReceipt={(purchase) => void openReceipt(purchase)}
      />
      <KardexDialog
        open={dialog === "kardex"}
        item={selectedInsumo}
        movements={movements}
        onClose={closeDialog}
      />
      <DeleteConfirmationDialog
        open={deleteTarget !== null}
        name={deleteTarget?.name ?? ""}
        type={deleteTarget?.type ?? "insumo"}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() =>
          void (deleteTarget?.type === "proveedor"
            ? confirmProviderDelete()
            : confirmDelete())
        }
      />
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4500}
        onClose={() => setToast("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={toastSeverity}
          variant="filled"
          onClose={() => setToast("")}
        >
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  );
}
