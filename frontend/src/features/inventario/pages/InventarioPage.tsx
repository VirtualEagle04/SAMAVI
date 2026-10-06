import { getGalpones } from "../../galpones/services/galponesService";
import type { GalponResumen } from "../../galpones/types/galpones.types";
import { useCallback, useEffect, useMemo, useState } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArchiveRoundedIcon from "@mui/icons-material/ArchiveRounded";
import AttachFileRoundedIcon from "@mui/icons-material/AttachFileRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import FactCheckRoundedIcon from "@mui/icons-material/FactCheckRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import StoreRoundedIcon from "@mui/icons-material/StoreRounded";
import SwapVertRoundedIcon from "@mui/icons-material/SwapVertRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import Alert from "@mui/material/Alert";
import Backdrop from "@mui/material/Backdrop";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Tab from "@mui/material/Tab";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
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
import KardexDialog from "../components/KardexDialog";
import DeleteConfirmationDialog from "../components/DeleteConfirmationDialog";

const panel = {
  border: "1px solid",
  borderColor: "divider",
  borderRadius: 3,
  bgcolor: "background.paper",
} as const;

const formatCopInput = (value: number | string) => {
  const digits = String(value).split(".")[0].replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, -3)},${digits.slice(-3)}`;
  return `${digits.slice(0, -6)}'${digits.slice(-6, -3)},${digits.slice(-3)}`;
};
const money = (value: number | string) => `$ ${formatCopInput(value)} COP`;
const amount = (value: number | string) =>
  Number(value).toLocaleString("es-CO", { maximumFractionDigits: 2 });
const date = (value: string) =>
  new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(
    new Date(value),
  );
const dateTime = (value: string) =>
  new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
const phonePattern = /^[0-9()\s-]{7,20}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValidPhone = (value: string) =>
  value === "" || phonePattern.test(value);
const isValidEmail = (value: string) =>
  value === "" || emailPattern.test(value);
const receiptMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

const movementOptions = [
  { value: "CONSUMO_GALPON", label: "Consumo en galpón", effect: "salida" },
  { value: "AJUSTE_POS", label: "Ajuste positivo", effect: "entrada" },
  { value: "AJUSTE_NEG", label: "Ajuste negativo", effect: "salida" },
  { value: "DEVOLUCION", label: "Devolución", effect: "entrada" },
  { value: "MERMA", label: "Merma o pérdida", effect: "salida" },
] as const;

type DialogName =
  | "insumo"
  | "proveedor"
  | "compra"
  | "movimiento"
  | "kardex"
  | null;
type ToastSeverity = "success" | "error";
type DeleteTarget = { type: "insumo" | "proveedor"; id: number; name: string };
type InsumoForm = {
  id?: number;
  codigo: string;
  nombre: string;
  unidadMedida: string;
  stockMinimo: string;
  costo: string;
  descripcion: string;
};
type ProviderForm = {
  id?: number;
  nombre: string;
  telefono: string;
  email: string;
  direccion: string;
};
type PurchaseLine = {
  insumoId: string;
  cantidad: string;
  costoUnitario: string;
  lote: string;
  fechaVencimiento: string;
};
type MovementForm = {
  codigoTipoMovimiento: string;
  insumoId: string;
  galponId: string;
  cantidad: string;
  costoUnitario: string;
  observaciones: string;
};

const emptyInsumo: InsumoForm = {
  codigo: "",
  nombre: "",
  unidadMedida: "unidad",
  stockMinimo: "",
  costo: "",
  descripcion: "",
};
const emptyProvider: ProviderForm = {
  nombre: "",
  telefono: "",
  email: "",
  direccion: "",
};
const emptyLine: PurchaseLine = {
  insumoId: "",
  cantidad: "",
  costoUnitario: "",
  lote: "",
  fechaVencimiento: "",
};
const emptyMovement: MovementForm = {
  codigoTipoMovimiento: "CONSUMO_GALPON",
  insumoId: "",
  galponId: "",
  cantidad: "",
  costoUnitario: "",
  observaciones: "",
};

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
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [purchaseInvoice, setPurchaseInvoice] = useState("");
  const [purchaseNotes, setPurchaseNotes] = useState("");
  const [receipt, setReceipt] = useState<File | undefined>();
  const [receiptError, setReceiptError] = useState("");
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
    }
  };

  const openPurchase = () => {
    setPurchaseProvider(providers[0] ? String(providers[0].id) : "");
    setPurchaseLines([{ ...emptyLine }]);
    setPurchaseDate(new Date().toISOString().slice(0, 10));
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
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: { xs: 1.5, sm: 2.5 },
        pb: 3,
      }}
    >
      <Box
        sx={{
          ...panel,
          overflow: "hidden",
          position: "relative",
          background:
            "linear-gradient(120deg, #24443a 0%, #315b45 58%, #e29a54 170%)",
          color: "#fff",
          border: 0,
          p: { xs: 2.2, sm: 3.2 },
        }}
      >
        <Box
          sx={{
            position: "absolute",
            width: 220,
            height: 220,
            border: "1px solid rgba(255,255,255,.18)",
            borderRadius: "50%",
            right: -90,
            top: -110,
          }}
        />
        <Box
          sx={{
            position: "absolute",
            width: 160,
            height: 160,
            border: "1px solid rgba(255,255,255,.12)",
            borderRadius: "50%",
            right: -30,
            top: -70,
          }}
        />
        <Stack
          direction="row"
          sx={{
            justifyContent: "space-between",
            alignItems: "flex-start",
            position: "relative",
          }}
        >
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontSize: { xs: "1.75rem", sm: "2.25rem" },
                fontWeight: 900,
                letterSpacing: "-.04em",
              }}
            >
              Inventario
            </Typography>
          </Box>
          <Inventory2RoundedIcon
            sx={{ fontSize: { xs: 38, sm: 52 }, opacity: 0.88 }}
          />
        </Stack>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{ mt: 2.4, position: "relative" }}
        >
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={openPurchase}
            sx={{
              bgcolor: "#f2bd72",
              color: "#263c33",
              "&:hover": { bgcolor: "#ffd08f" },
              minHeight: 48,
            }}
          >
            Registrar compra
          </Button>
          <Button
            variant="outlined"
            startIcon={<SwapVertRoundedIcon />}
            onClick={openMovement}
            sx={{
              borderColor: "rgba(255,255,255,.42)",
              color: "#fff",
              "&:hover": {
                borderColor: "#fff",
                bgcolor: "rgba(255,255,255,.08)",
              },
              minHeight: 48,
            }}
          >
            Registrar movimiento
          </Button>
        </Stack>
      </Box>

      <Box sx={{ ...panel, px: { xs: 0.5, sm: 1 }, overflow: "auto" }}>
        <Tabs
          value={tab}
          onChange={(_, value: number) => setTab(value)}
          variant="scrollable"
          scrollButtons={false}
          sx={{
            minHeight: 50,
            "& .MuiTab-root": {
              minHeight: 50,
              minWidth: { xs: 118, sm: 150 },
              fontWeight: 800,
            },
          }}
        >
          <Tab
            icon={<Inventory2RoundedIcon fontSize="small" />}
            iconPosition="start"
            label="Resumen"
          />
          <Tab
            icon={<SwapVertRoundedIcon fontSize="small" />}
            iconPosition="start"
            label="Movimientos"
          />
          <Tab
            icon={<ReceiptLongRoundedIcon fontSize="small" />}
            iconPosition="start"
            label="Compras"
          />
          <Tab
            icon={<StoreRoundedIcon fontSize="small" />}
            iconPosition="start"
            label="Proveedores"
          />
        </Tabs>
      </Box>

      {tab === 0 && (
        <SummaryView
          stock={stock}
          critical={critical}
          totalValue={totalValue}
          search={search}
          activeOnly={activeOnly}
          filteredStock={filteredStock}
          setSearch={setSearch}
          setActiveOnly={setActiveOnly}
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
        <MovementView
          stock={stock}
          movements={movements}
          selected={selectedInsumo}
          onSelect={(item) => void openKardex(item, true)}
          onNew={openMovement}
        />
      )}
      {tab === 2 && (
        <PurchaseView
          purchases={purchases}
          onNew={openPurchase}
          onReceipt={(purchase) => void openReceipt(purchase)}
        />
      )}
      {tab === 3 && (
        <ProviderView
          providers={providers}
          onNew={openNewProvider}
          onEdit={openEditProvider}
          onToggle={handleToggleProvider}
          onDelete={handleDeleteProvider}
        />
      )}

      <InsumoDialog
        open={dialog === "insumo"}
        form={insumoForm}
        setForm={setInsumoForm}
        onClose={closeDialog}
        onSave={() => void saveInsumo()}
      />
      <ProviderDialog
        open={dialog === "proveedor"}
        form={providerForm}
        setForm={setProviderForm}
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
        onClose={closeDialog}
        onSave={() => void savePurchase()}
      />
      <MovementDialog
        open={dialog === "movimiento"}
        stock={stock.filter((item) => item.activo)}
        galpones={galpones.filter((item) => item.estado === "activo")}
        form={movementForm}
        setForm={setMovementForm}
        onClose={closeDialog}
        onSave={() => void saveMovement()}
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
      <Backdrop
        open={savingPurchase || savingMovement}
        sx={{
          zIndex: (theme) => theme.zIndex.modal + 1,
          color: "#fff",
          flexDirection: "column",
          gap: 1,
        }}
      >
        <CircularProgress color="inherit" />
        <Typography sx={{ fontWeight: 800 }}>
          {savingPurchase ? "Guardando compra..." : "Guardando movimiento..."}
        </Typography>
      </Backdrop>
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4500}
        onClose={() => setToast("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
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

function SummaryView({
  stock,
  critical,
  totalValue,
  search,
  activeOnly,
  filteredStock,
  setSearch,
  setActiveOnly,
  onNew,
  onEdit,
  onKardex,
  onToggle,
  onDelete,
}: {
  stock: StockInsumo[];
  critical: StockInsumo[];
  totalValue: number;
  search: string;
  activeOnly: boolean;
  filteredStock: StockInsumo[];
  setSearch: (value: string) => void;
  setActiveOnly: (value: boolean) => void;
  onNew: () => void;
  onEdit: (item: StockInsumo) => void;
  onKardex: (item: StockInsumo) => void;
  onToggle: (item: StockInsumo) => Promise<void>;
  onDelete: (item: StockInsumo) => Promise<void>;
}) {
  return (
    <>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(4, 1fr)" },
          gap: { xs: 1, sm: 1.5 },
        }}
      >
        <Metric
          label="Insumos activos"
          value={stock.filter((item) => item.activo).length}
          detail={`${stock.length} registrados`}
          icon={<Inventory2RoundedIcon />}
          color="#e8f1ea"
        />
        <Metric
          label="Stock crítico"
          value={critical.length}
          detail="Requieren atención"
          icon={<ErrorOutlineRoundedIcon />}
          color="#fff0db"
          alert={critical.length > 0}
        />
        <Metric
          label="Valor en bodega"
          value={money(totalValue)}
          detail="Costo promedio"
          icon={<ArchiveRoundedIcon />}
          color="#e9f0f8"
        />
        <Metric
          label="Unidades controladas"
          value={amount(
            stock.reduce((sum, item) => sum + Number(item.stock), 0),
          )}
          detail="Existencia total"
          icon={<FactCheckRoundedIcon />}
          color="#f5ebdf"
        />
      </Box>

      {critical.length > 0 && (
        <Card
          elevation={0}
          sx={{
            ...panel,
            p: { xs: 1.5, sm: 2 },
            borderColor: "#e7b368",
            background: "linear-gradient(100deg, #fff8ed, #fffdf9)",
          }}
        >
          <Stack
            direction="row"
            spacing={1.2}
            sx={{ alignItems: "flex-start" }}
          >
            <ErrorOutlineRoundedIcon sx={{ color: "#bb711c", mt: 0.2 }} />
            <Box>
              <Typography sx={{ fontWeight: 900, color: "#704411" }}>
                Hay {critical.length}{" "}
                {critical.length === 1 ? "insumo" : "insumos"} bajo mínimo
              </Typography>
              <Typography variant="body2">
                Revisa las existencias con estado{" "}
                <Chip
                  size="small"
                  label="Bajo"
                  color="warning"
                  variant="outlined"
                ></Chip>{" "}
                y programa una compra.
              </Typography>
            </Box>
          </Stack>
        </Card>
      )}

      <Box sx={{ ...panel, overflow: "hidden" }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          sx={{
            p: { xs: 1.5, sm: 2 },
            justifyContent: "space-between",
            alignItems: { sm: "center" },
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              Existencias
            </Typography>
            <Typography variant="body2">
              Stock actual por insumo, calculado desde el kardex.
            </Typography>
          </Box>
          <Button
            startIcon={<AddRoundedIcon />}
            variant="contained"
            onClick={onNew}
          >
            Nuevo insumo
          </Button>
        </Stack>
        <Divider />
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{ p: { xs: 1.5, sm: 2 } }}
        >
          <TextField
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por código o nombre"
            size="small"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
          <Button
            variant={activeOnly ? "contained" : "outlined"}
            onClick={() => setActiveOnly(!activeOnly)}
            sx={{ whiteSpace: "nowrap" }}
          >
            {activeOnly ? "Solo activos" : "Ver todos"}
          </Button>
        </Stack>
        <StockTable
          items={filteredStock}
          onEdit={onEdit}
          onKardex={onKardex}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      </Box>
    </>
  );
}

function Metric({
  label,
  value,
  detail,
  icon,
  color,
  alert,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: React.ReactNode;
  color: string;
  alert?: boolean;
}) {
  return (
    <Card elevation={0} sx={{ ...panel, p: { xs: 1.3, sm: 1.8 }, minWidth: 0 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: 2,
            bgcolor: color,
            display: "grid",
            placeItems: "center",
            color: alert ? "#a76011" : "#315b45",
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 800, display: "block", lineHeight: 1.15 }}
          >
            {label}
          </Typography>
          <Typography
            sx={{
              fontWeight: 900,
              fontSize: { xs: "1.1rem", sm: "1.35rem" },
              lineHeight: 1.25,
              mt: 0.3,
              overflowWrap: "anywhere",
            }}
          >
            {value}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: { xs: "none", sm: "block" } }}
          >
            {detail}
          </Typography>
        </Box>
      </Stack>
    </Card>
  );
}

function StockTable({
  items,
  onEdit,
  onKardex,
  onToggle,
  onDelete,
}: {
  items: StockInsumo[];
  onEdit: (item: StockInsumo) => void;
  onKardex: (item: StockInsumo) => void;
  onToggle: (item: StockInsumo) => Promise<void>;
  onDelete: (item: StockInsumo) => Promise<void>;
}) {
  if (!items.length)
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography color="text.secondary">
          No hay insumos para mostrar.
        </Typography>
      </Box>
    );
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Insumo</TableCell>
            <TableCell align="right">Stock</TableCell>
            <TableCell align="right">Costo</TableCell>
            <TableCell align="right">Estado</TableCell>
            <TableCell align="right" />
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => {
            const low = Number(item.stock) <= Number(item.stockMinimo);
            return (
              <TableRow key={item.id} hover>
                <TableCell sx={{ minWidth: 150 }}>
                  <Typography sx={{ fontWeight: 800 }}>
                    {item.nombre}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.codigo} · {item.unidadMedida}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography
                    sx={{
                      fontWeight: 900,
                      color: low ? "#aa681c" : "text.primary",
                    }}
                  >
                    {amount(item.stock)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    mín. {amount(item.stockMinimo)}
                  </Typography>
                </TableCell>
                <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                  {money(item.costo)}
                </TableCell>
                <TableCell align="right">
                  {item.activo ? (
                    <Chip
                      size="small"
                      label={low ? "Bajo" : "Normal"}
                      color={low ? "warning" : "success"}
                      variant={low ? "outlined" : "filled"}
                    />
                  ) : (
                    <Chip size="small" label="Inactivo" variant="outlined" />
                  )}
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" sx={{ justifyContent: "flex-end" }}>
                    <IconButton
                      aria-label="Ver kardex"
                      title="Ver kardex"
                      size="small"
                      onClick={() => onKardex(item)}
                    >
                      <VisibilityRoundedIcon fontSize="small" />
                    </IconButton>
                    <Switch
                      checked={item.activo}
                      onChange={() => void onToggle(item)}
                      slotProps={{
                        input: {
                          "aria-label": `${item.activo ? "Desactivar" : "Activar"} ${item.nombre}`,
                        },
                      }}
                      size="small"
                    />
                    <IconButton
                      aria-label="Editar insumo"
                      title="Editar"
                      size="small"
                      onClick={() => onEdit(item)}
                    >
                      <EditRoundedIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      aria-label="Eliminar insumo permanentemente"
                      title="Eliminar permanentemente"
                      size="small"
                      onClick={() => void onDelete(item)}
                    >
                      <DeleteOutlineRoundedIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function MovementView({
  stock,
  movements,
  selected,
  onSelect,
  onNew,
}: {
  stock: StockInsumo[];
  movements: Movimiento[];
  selected: StockInsumo | null;
  onSelect: (item: StockInsumo) => void;
  onNew: () => void;
}) {
  const activeStock = stock.filter((item) => item.activo);
  return (
    <Stack spacing={1.5}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        sx={{
          justifyContent: "space-between",
          gap: 1,
          alignItems: { sm: "center" },
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 900 }}>
            Kardex
          </Typography>
          <Typography color="text.secondary">
            Consulta entradas, salidas y ajustes por insumo.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<SwapVertRoundedIcon />}
          onClick={onNew}
        >
          Nuevo movimiento
        </Button>
      </Stack>
      <TextField
        select
        fullWidth
        required
        label="Insumo"
        value={selected?.id ?? ""}
        onChange={(event) => {
          const item = activeStock.find(
            (candidate) => candidate.id === Number(event.target.value),
          );
          if (item) onSelect(item);
        }}
      >
        <MenuItem value="">Selecciona un insumo</MenuItem>
        {activeStock.map((item) => (
          <MenuItem key={item.id} value={item.id}>
            {item.nombre} · {item.codigo} · stock: {amount(item.stock)}{" "}
            {item.unidadMedida}
          </MenuItem>
        ))}
      </TextField>
      {selected ? (
        <Box sx={{ ...panel, overflow: "hidden" }}>
          <Box sx={{ p: 2 }}>
            <Typography sx={{ fontWeight: 900 }}>{selected.nombre}</Typography>
            <Typography variant="body2">
              {selected.codigo} · {amount(selected.stock)}{" "}
              {selected.unidadMedida} disponibles
            </Typography>
          </Box>
          <Divider />
          <MovementCards movements={movements} />
        </Box>
      ) : (
        <Box sx={{ py: 4, textAlign: "center" }}>
          <SwapVertRoundedIcon sx={{ fontSize: 42, color: "text.disabled" }} />
          <Typography sx={{ fontWeight: 800, mt: 1 }}>
            Selecciona un insumo arriba
          </Typography>
          <Typography variant="body2">El historial aparecerá aquí.</Typography>
        </Box>
      )}
    </Stack>
  );
}

function MovementCards({ movements }: { movements: Movimiento[] }) {
  if (!movements.length)
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="text.secondary">
          No hay movimientos registrados.
        </Typography>
      </Box>
    );
  return (
    <Stack spacing={1} sx={{ p: { xs: 1.2, sm: 1.5 } }}>
      {movements.map((item) => {
        const input = item.tipoMovimiento.efecto === "entrada";
        return (
          <Card
            key={String(item.id)}
            variant="outlined"
            sx={{
              p: 1.5,
              borderRadius: 2,
              borderColor: input ? "#acd1b5" : "#e7c58f",
            }}
          >
            <Stack
              direction="row"
              sx={{
                justifyContent: "space-between",
                gap: 1,
                alignItems: "center",
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 900 }}>
                  {item.tipoMovimiento.nombre}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {dateTime(item.fecha)} ·{" "}
                  {item.idCompra
                    ? `Compra #${item.idCompra}`
                    : item.idGalpon
                      ? `Galpón ${item.idGalpon}`
                      : "Bodega"}
                </Typography>
              </Box>
              <Typography
                sx={{
                  fontWeight: 900,
                  color: input ? "success.dark" : "warning.dark",
                  whiteSpace: "nowrap",
                }}
              >
                {input ? "+" : "-"}
                {amount(item.cantidad)}
              </Typography>
            </Stack>
          </Card>
        );
      })}
    </Stack>
  );
}

function PurchaseView({
  purchases,
  onNew,
  onReceipt,
}: {
  purchases: Compra[];
  onNew: () => void;
  onReceipt: (purchase: Compra) => void;
}) {
  return (
    <Stack spacing={1.5}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        sx={{
          justifyContent: "space-between",
          gap: 1,
          alignItems: { sm: "center" },
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 900 }}>
            Compras
          </Typography>
          <Typography color="text.secondary">
            Entradas de mercancía y documentos de soporte.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={onNew}
        >
          Nueva compra
        </Button>
      </Stack>
      <Box sx={{ ...panel, overflow: "hidden" }}>
        {purchases.length ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Proveedor</TableCell>
                  <TableCell>Detalle</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="right">Recibo</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {purchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {date(purchase.fecha)}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>
                      {purchase.proveedor.nombre}
                    </TableCell>
                    <TableCell>
                      {purchase.detalles.length}{" "}
                      {purchase.detalles.length === 1 ? "insumo" : "insumos"}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 900, whiteSpace: "nowrap" }}
                    >
                      {money(purchase.total)}
                    </TableCell>
                    <TableCell align="right">
                      {purchase.reciboMimeType ? (
                        <IconButton
                          aria-label="Abrir recibo"
                          title="Abrir recibo"
                          onClick={() => onReceipt(purchase)}
                        >
                          <AttachFileRoundedIcon />
                        </IconButton>
                      ) : (
                        <Typography variant="caption" color="text.disabled">
                          Sin archivo
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <EmptyState
            icon={<ReceiptLongRoundedIcon />}
            title="Sin compras todavía"
            text="Registra la primera entrada para comenzar a valorar el inventario."
            onAction={onNew}
            action="Registrar compra"
          />
        )}
      </Box>
    </Stack>
  );
}

function ProviderView({
  providers,
  onNew,
  onEdit,
  onToggle,
  onDelete,
}: {
  providers: Proveedor[];
  onNew: () => void;
  onEdit: (provider: Proveedor) => void;
  onToggle: (provider: Proveedor) => Promise<void>;
  onDelete: (provider: Proveedor) => Promise<void>;
}) {
  return (
    <Stack spacing={1.5}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        sx={{
          justifyContent: "space-between",
          gap: 1,
          alignItems: { sm: "center" },
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 900 }}>
            Proveedores
          </Typography>
          <Typography color="text.secondary">
            Contactos activos para abastecer la operación.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={onNew}
        >
          Nuevo proveedor
        </Button>
      </Stack>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            lg: "repeat(3, 1fr)",
          },
          gap: 1.5,
        }}
      >
        {providers.length ? (
          providers.map((provider) => (
            <Card key={provider.id} elevation={0} sx={{ ...panel, p: 2 }}>
              <Stack
                direction="row"
                sx={{
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <StoreRoundedIcon sx={{ color: "#315b45", mb: 1 }} />
                  <Typography sx={{ fontWeight: 900 }}>
                    {provider.nombre}
                  </Typography>
                  <Typography variant="body2" noWrap>
                    {String(provider.contacto?.telefono ?? "Sin teléfono")}
                  </Typography>
                  <Typography variant="body2" noWrap>
                    {String(provider.contacto?.email ?? "Sin correo")}
                  </Typography>
                </Box>
                <IconButton
                  aria-label={`Acciones de ${provider.nombre}`}
                  onClick={() => onEdit(provider)}
                >
                  <EditRoundedIcon fontSize="small" />
                </IconButton>
              </Stack>
              <Stack
                direction="row"
                sx={{
                  justifyContent: "space-between",
                  alignItems: "center",
                  mt: 2,
                }}
              >
                <Stack direction="row" sx={{ alignItems: "center" }}>
                  <Chip
                    size="small"
                    label={provider.activo ? "Activo" : "Inactivo"}
                    color={provider.activo ? "success" : "default"}
                    variant={provider.activo ? "filled" : "outlined"}
                  />
                  <Switch
                    checked={provider.activo}
                    onChange={() => void onToggle(provider)}
                    slotProps={{
                      input: {
                        "aria-label": `${provider.activo ? "Desactivar" : "Activar"} ${provider.nombre}`,
                      },
                    }}
                    size="small"
                  />
                  <IconButton
                    aria-label={`Eliminar ${provider.nombre} permanentemente`}
                    title="Eliminar permanentemente"
                    size="small"
                    onClick={() => void onDelete(provider)}
                  >
                    <DeleteOutlineRoundedIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Stack>
            </Card>
          ))
        ) : (
          <EmptyState
            icon={<StoreRoundedIcon />}
            title="Sin proveedores"
            text="Agrega los contactos que abastecen tu bodega."
            onAction={onNew}
            action="Agregar proveedor"
          />
        )}
      </Box>
    </Stack>
  );
}

function EmptyState({
  icon,
  title,
  text,
  action,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <Box sx={{ p: 4, textAlign: "center", gridColumn: "1 / -1" }}>
      {icon}
      <Typography sx={{ fontWeight: 900, mt: 1 }}>{title}</Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        {text}
      </Typography>
      <Button variant="outlined" onClick={onAction}>
        {action}
      </Button>
    </Box>
  );
}

function DialogFrame({
  open,
  title,
  children,
  actions,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  actions: React.ReactNode;
}) {
  return (
    <Dialog
      open={open}
      onClose={() => undefined}
      fullWidth
      maxWidth="sm"
      slotProps={{
        paper: {
          sx: {
            borderRadius: { xs: 3, sm: 4 },
            m: { xs: 1.5, sm: 3 },
            width: "calc(100% - 24px)",
          },
        },
      }}
    >
      <DialogTitle
        sx={{ fontWeight: 900, pb: title === "Registrar compra" ? 0.5 : 2 }}
      >
        {title}
      </DialogTitle>
      {title === "Registrar compra" && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ px: 3, pb: 1.5 }}
        >
          Todos los valores monetarios se expresan en $ COP.
        </Typography>
      )}
      <DialogContent dividers>{children}</DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>{actions}</DialogActions>
    </Dialog>
  );
}

function InsumoDialog({
  open,
  form,
  setForm,
  onClose,
  onSave,
}: {
  open: boolean;
  form: InsumoForm;
  setForm: (form: InsumoForm) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <DialogFrame
      open={open}
      title={form.id ? "Editar insumo" : "Nuevo insumo"}
      actions={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={onSave}
            disabled={!form.codigo || !form.nombre || !form.unidadMedida}
          >
            Guardar
          </Button>
        </>
      }
    >
      <Stack spacing={1.5} sx={{ pt: 0.5 }}>
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
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
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
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
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
    </DialogFrame>
  );
}

function ProviderDialog({
  open,
  form,
  setForm,
  onClose,
  onSave,
}: {
  open: boolean;
  form: ProviderForm;
  setForm: (form: ProviderForm) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const validPhone = isValidPhone(form.telefono);
  const validEmail = isValidEmail(form.email);
  return (
    <DialogFrame
      open={open}
      title={form.id ? "Editar proveedor" : "Nuevo proveedor"}
      actions={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={onSave}
            disabled={!form.nombre || !validPhone || !validEmail}
          >
            Guardar
          </Button>
        </>
      }
    >
      <Stack spacing={1.5} sx={{ pt: 0.5 }}>
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
    </DialogFrame>
  );
}

function PurchaseDialog({
  open,
  providers,
  insumos,
  provider,
  setProvider,
  date,
  setDate,
  invoice,
  setInvoice,
  notes,
  setNotes,
  lines,
  setLines,
  total,
  receipt,
  setReceipt,
  receiptError,
  setReceiptError,
  onClose,
  onSave,
}: {
  open: boolean;
  providers: Proveedor[];
  insumos: Insumo[];
  provider: string;
  setProvider: (value: string) => void;
  date: string;
  setDate: (value: string) => void;
  invoice: string;
  setInvoice: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
  lines: PurchaseLine[];
  setLines: (lines: PurchaseLine[]) => void;
  total: number;
  receipt?: File;
  setReceipt: (file: File | undefined) => void;
  receiptError: string;
  setReceiptError: (message: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const valid = Boolean(
    provider &&
      lines.every(
        (line) =>
          line.insumoId &&
          Number(line.cantidad) > 0 &&
          Number(line.costoUnitario) >= 0,
      ),
  );
  return (
    <DialogFrame
      open={open}
      title="Registrar compra"
      actions={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={onSave}
            disabled={!valid || !insumos.length || Boolean(receiptError)}
          >
            Guardar compra
          </Button>
        </>
      }
    >
      <Stack spacing={1.5} sx={{ pt: 0.5 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            select
            label="Proveedor"
            required
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          >
            <MenuItem value="">Selecciona</MenuItem>
            {providers.map((item) => (
              <MenuItem key={item.id} value={item.id}>
                {item.nombre}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Fecha"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Stack>
        <TextField
          label="Número de factura"
          value={invoice}
          placeholder="FAC-12345"
          onChange={(e) => setInvoice(e.target.value)}
        />
        <Typography sx={{ fontWeight: 900, mt: 1 }}>
          Detalle de la compra
        </Typography>
        {lines.map((line, index) => (
          <Card key={index} variant="outlined" sx={{ p: 1.2, borderRadius: 2 }}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1}>
                <TextField
                  select
                  label="Insumo"
                  required
                  value={line.insumoId}
                  onChange={(e) =>
                    setLines(
                      lines.map((item, i) =>
                        i === index
                          ? { ...item, insumoId: e.target.value }
                          : item,
                      ),
                    )
                  }
                >
                  <MenuItem value="">Selecciona</MenuItem>
                  {insumos.map((item) => (
                    <MenuItem key={item.id} value={item.id}>
                      {item.codigo} · {item.nombre}
                    </MenuItem>
                  ))}
                </TextField>
                <IconButton
                  aria-label="Quitar línea"
                  disabled={lines.length === 1}
                  onClick={() => setLines(lines.filter((_, i) => i !== index))}
                >
                  <DeleteOutlineRoundedIcon />
                </IconButton>
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <TextField
                  label="Cantidad"
                  type="number"
                  required
                  placeholder="100"
                  value={line.cantidad}
                  onChange={(e) =>
                    setLines(
                      lines.map((item, i) =>
                        i === index
                          ? { ...item, cantidad: e.target.value }
                          : item,
                      ),
                    )
                  }
                />
                <TextField
                  label="Costo unitario"
                  type="text"
                  required
                  placeholder="1,500"
                  value={formatCopInput(line.costoUnitario)}
                  onChange={(e) =>
                    setLines(
                      lines.map((item, i) =>
                        i === index
                          ? {
                              ...item,
                              costoUnitario: e.target.value.replace(/\D/g, ""),
                            }
                          : item,
                      ),
                    )
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
                  label="Lote"
                  value={line.lote}
                  placeholder="LOT-2026-001"
                  onChange={(e) =>
                    setLines(
                      lines.map((item, i) =>
                        i === index ? { ...item, lote: e.target.value } : item,
                      ),
                    )
                  }
                />
              </Stack>
            </Stack>
          </Card>
        ))}
        <Button
          startIcon={<AddRoundedIcon />}
          onClick={() => setLines([...lines, { ...emptyLine }])}
        >
          Agregar línea
        </Button>
        <TextField
          label="Observaciones"
          multiline
          minRows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <Button
          component="label"
          variant="outlined"
          startIcon={<AttachFileRoundedIcon />}
          sx={{ justifyContent: "flex-start" }}
        >
          {receipt ? receipt.name : "Adjuntar recibo (máx. 5 MB)"}
          <input
            hidden
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 5 * 1024 * 1024) {
                setReceipt(undefined);
                setReceiptError("El recibo supera el tamaño máximo de 5 MB.");
                return;
              }
              if (!receiptMimeTypes.has(file.type)) {
                setReceipt(undefined);
                setReceiptError("Formato no permitido. Usa PDF, JPG o PNG.");
                return;
              }
              setReceipt(file);
              setReceiptError("");
            }}
          />
        </Button>
        {receiptError && <Alert severity="error">{receiptError}</Alert>}
        <Stack
          direction="row"
          sx={{
            justifyContent: "space-between",
            bgcolor: "#eef4ee",
            p: 1.5,
            borderRadius: 2,
          }}
        >
          <Typography sx={{ fontWeight: 800 }}>Total</Typography>
          <Typography sx={{ fontWeight: 900, color: "#315b45" }}>
            {money(total)}
          </Typography>
        </Stack>
      </Stack>
    </DialogFrame>
  );
}

function MovementDialog({
  open,
  stock,
  galpones,
  form,
  setForm,
  onClose,
  onSave,
}: {
  open: boolean;
  stock: StockInsumo[];
  galpones: GalponResumen[];
  form: MovementForm;
  setForm: (form: MovementForm) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const option = movementOptions.find(
    (item) => item.value === form.codigoTipoMovimiento,
  );
  const valid = Boolean(
    form.insumoId &&
      Number(form.cantidad) > 0 &&
      (option?.value !== "CONSUMO_GALPON" || form.galponId),
  );
  return (
    <DialogFrame
      open={open}
      title="Registrar movimiento"
      actions={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="contained" onClick={onSave} disabled={!valid}>
            Registrar
          </Button>
        </>
      }
    >
      <Stack spacing={1.5} sx={{ pt: 0.5 }}>
        <TextField
          select
          label="Tipo de movimiento"
          required
          value={form.codigoTipoMovimiento}
          onChange={(e) =>
            setForm({ ...form, codigoTipoMovimiento: e.target.value })
          }
        >
          {movementOptions.map((item) => (
            <MenuItem key={item.value} value={item.value}>
              {item.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Insumo"
          required
          value={form.insumoId}
          onChange={(e) => setForm({ ...form, insumoId: e.target.value })}
        >
          <MenuItem value="">Selecciona</MenuItem>
          {stock.map((item) => (
            <MenuItem key={item.id} value={item.id}>
              {item.codigo} · {item.nombre} ({amount(item.stock)} disponibles)
            </MenuItem>
          ))}
        </TextField>
        {option?.value === "CONSUMO_GALPON" && (
          <TextField
            select
            label="Galpón"
            required
            value={form.galponId}
            onChange={(e) => setForm({ ...form, galponId: e.target.value })}
            helperText="Obligatorio para consumo en galpón"
          >
            <MenuItem value="">Selecciona</MenuItem>
            {galpones.map((galpon) => (
              <MenuItem key={galpon.id} value={galpon.id}>
                {galpon.nombre}
              </MenuItem>
            ))}
          </TextField>
        )}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            label="Cantidad"
            type="number"
            required
            placeholder="10"
            value={form.cantidad}
            onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
          />
          <TextField
            label="Costo unitario"
            type="text"
            placeholder="1,500"
            value={formatCopInput(form.costoUnitario)}
            onChange={(e) =>
              setForm({
                ...form,
                costoUnitario: e.target.value.replace(/\D/g, ""),
              })
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
        </Stack>
        <TextField
          label="Observaciones"
          multiline
          minRows={2}
          value={form.observaciones}
          onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
        />
      </Stack>
    </DialogFrame>
  );
}
