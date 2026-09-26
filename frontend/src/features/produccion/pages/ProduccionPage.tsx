import { useState, useEffect, useCallback } from "react"
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import CircularProgress from "@mui/material/CircularProgress"
import Container from "@mui/material/Container"
import Snackbar from "@mui/material/Snackbar"
import Tab from "@mui/material/Tab"
import Tabs from "@mui/material/Tabs"
import Typography from "@mui/material/Typography"
import LockRoundedIcon from "@mui/icons-material/LockRounded"
import FormatListNumberedRoundedIcon from "@mui/icons-material/FormatListNumberedRounded"
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded"
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded"
import { useAuthStore } from "../../../stores/authStore"
import LiveMonitoringCard from "../components/LiveMonitoringCard"
import ProductionKpiCards from "../components/ProductionKpiCards"
import CountsTable from "../components/CountsTable"
import ClosuresTable from "../components/ClosuresTable"
import RegisterCountDialog from "../components/RegisterCountDialog"
import DailyCloseDialog from "../components/DailyCloseDialog"
import {
  closeDailyProduction,
  getCategorias,
  getCierres,
  getCounts,
  getDeviceStatus,
  getGalpones,
  registerCount,
} from "../services/produccionService"
import type {
  CategoriaPeso,
  CierreDiario,
  DailyClosePayload,
  DeviceStatus,
  Galpon,
  LogConteo,
  RegisterCountPayload,
} from "../types/produccion.types"

// Default fallback categories in case DB is initially empty
const DEFAULT_CATEGORIES: CategoriaPeso[] = [
  { codigo: "Y", nombre: "Yumbo", pesoMinG: 78, pesoMaxG: null },
  { codigo: "Ex", nombre: "Extra", pesoMinG: 67, pesoMaxG: 77 },
  { codigo: "AA", nombre: "AA", pesoMinG: 60, pesoMaxG: 66 },
  { codigo: "A", nombre: "A", pesoMinG: 53, pesoMaxG: 59 },
  { codigo: "B", nombre: "B", pesoMinG: 46, pesoMaxG: 52 },
  { codigo: "C", nombre: "C", pesoMinG: 45, pesoMaxG: 45 },
  { codigo: "P", nombre: "Pipo", pesoMinG: null, pesoMaxG: 45 },
  { codigo: "Q", nombre: "Quebrado", pesoMinG: null, pesoMaxG: null },
]

export default function ProduccionPage() {
  const { role, permissions } = useAuthStore()

  // RBAC Permission Check
  const hasAccess =
    role === "Administrador" ||
    role === "Galponero" ||
    permissions.includes("VER_PRODUCCION")

  const canPerformActions =
    role === "Administrador" ||
    role === "Galponero" ||
    permissions.includes("VER_PRODUCCION")

  // State
  const [counts, setCounts] = useState<LogConteo[]>([])
  const [galpones, setGalpones] = useState<Galpon[]>([])
  const [categorias, setCategorias] = useState<CategoriaPeso[]>(DEFAULT_CATEGORIES)
  const [cierres, setCierres] = useState<CierreDiario[]>([])
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus | null>(null)

  const [selectedGalponId, setSelectedGalponId] = useState<number | "all">("all")
  const [activeTab, setActiveTab] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Modal dialog states
  const [registerModalOpen, setRegisterModalOpen] = useState(false)
  const [preselectedCategory, setPreselectedCategory] = useState<string | undefined>()
  const [dailyCloseModalOpen, setDailyCloseModalOpen] = useState(false)

  // Notification Toast
  const [toast, setToast] = useState<{
    open: boolean
    message: string
    severity: "success" | "error" | "info"
  }>({
    open: false,
    message: "",
    severity: "success",
  })

  // Data fetching
  const loadData = useCallback(async (showLoading = false) => {
    if (!hasAccess) return
    if (showLoading) setIsLoading(true)

    try {
      const [countsData, galponesData, categoriasData, cierresData, devStatus] = await Promise.all([
        getCounts(undefined, 200).catch(() => []),
        getGalpones().catch(() => []),
        getCategorias().catch(() => DEFAULT_CATEGORIES),
        getCierres().catch(() => []),
        getDeviceStatus().catch(() => null),
      ])

      setCounts(countsData)
      setGalpones(galponesData)
      if (categoriasData.length > 0) {
        const order = ["Y", "Ex", "AA", "A", "B", "C", "P", "Q"]
        const sortedCats = [...categoriasData].sort((a, b) => {
          const idxA = order.indexOf(a.codigo)
          const idxB = order.indexOf(b.codigo)
          return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB)
        })
        setCategorias(sortedCats)
      }
      setCierres(cierresData)
      setDeviceStatus(devStatus)
      setLastUpdated(new Date())
    } catch (err) {
      console.error("Error al cargar datos de producción:", err)
    } finally {
      if (showLoading) setIsLoading(false)
    }
  }, [hasAccess])

  useEffect(() => {
    loadData(true)

    // Auto-polling interval for real-time live monitoring (every 10 seconds)
    const interval = setInterval(() => {
      loadData(false)
    }, 10000)

    return () => clearInterval(interval)
  }, [loadData])

  // Handle Quick count (+1 / -1) from the Live card
  const handleQuickCount = async (categoriaCodigo: string, cantidad: 1 | -1) => {
    // If "all" is selected, determine the first active galpon
    const targetGalponId =
      selectedGalponId === "all"
        ? galpones.find((g) => g.estado === "activo")?.id || galpones[0]?.id || 1
        : selectedGalponId

    try {
      await registerCount({
        galponId: targetGalponId,
        categoriaPeso: categoriaCodigo,
        cantidad,
        timestamp: new Date().toISOString(),
      })

      setToast({
        open: true,
        message: `Conteo registrado: ${cantidad > 0 ? "+1" : "-1"} ${categoriaCodigo} en Galpón ${targetGalponId}`,
        severity: "success",
      })

      // Refresh data
      loadData(false)
    } catch (err) {
      setToast({
        open: true,
        message: err instanceof Error ? err.message : "Error al registrar el conteo",
        severity: "error",
      })
    }
  }

  const handleRegisterCount = async (payload: RegisterCountPayload) => {
    await registerCount(payload)
    setToast({
      open: true,
      message: `Conteo de producción guardado con éxito (${payload.cantidad > 0 ? "+1" : "-1"} ${payload.categoriaPeso})`,
      severity: "success",
    })
    loadData(false)
  }

  const handleDailyClose = async (payload: DailyClosePayload) => {
    const res = await closeDailyProduction(payload)
    setToast({
      open: true,
      message: `Cierre diario completado exitosamente (${res.length} categorías consolidadas)`,
      severity: "success",
    })
    loadData(false)
  }

  // Unauthorized state
  if (!hasAccess) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Box
          sx={{
            textAlign: "center",
            p: 4,
            borderRadius: 1.5,
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Box
            sx={{
              display: "inline-flex",
              p: 2,
              borderRadius: "50%",
              bgcolor: "#fee2e2",
              color: "error.main",
              mb: 2,
            }}
          >
            <LockRoundedIcon sx={{ fontSize: 40 }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, color: "text.primary" }}>
            Acceso Restringido a Producción
          </Typography>
          <Typography variant="body1" sx={{ color: "text.secondary", maxWidth: 460, mx: "auto", mb: 3 }}>
            Tu rol actual (<strong>{role ?? "Usuario"}</strong>) no cuenta con los permisos requeridos (<code>VER_PRODUCCION</code>) para visualizar o registrar datos de producción avícola.
          </Typography>
        </Box>
      </Container>
    )
  }

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 350, py: 6 }}>
        <CircularProgress color="primary" />
      </Box>
    )
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {/* 1. HERO CARD: LIVE MONITORING & ONGOING COUNT (MOSTRAR PRIMERO) */}
      <LiveMonitoringCard
        counts={counts}
        galpones={galpones}
        categorias={categorias}
        selectedGalponId={selectedGalponId}
        onSelectGalpon={setSelectedGalponId}
        onRefresh={() => loadData(false)}
        onOpenRegisterModal={(cat) => {
          setPreselectedCategory(cat)
          setRegisterModalOpen(true)
        }}
        onQuickCount={handleQuickCount}
        lastUpdated={lastUpdated}
        deviceStatus={deviceStatus}
      />

      {/* 2. CONCISE EXECUTIVE KPIS (POCAS TARJETAS RELEVANTES) */}
      <ProductionKpiCards
        counts={counts}
        cierres={cierres}
        galpones={galpones}
        selectedGalponId={selectedGalponId}
        onOpenDailyCloseModal={() => setDailyCloseModalOpen(true)}
        canPerformClose={canPerformActions}
      />

      {/* 3. SERIOUS DATA TABLES & ANALYTICS SECTION */}
      <Box sx={{ mt: 1 }}>
        <Box sx={{ borderBottom: "1px solid", borderColor: "divider", mb: 2 }}>
          <Tabs
            value={activeTab}
            onChange={(_e, val) => setActiveTab(val)}
            textColor="primary"
            indicatorColor="primary"
            sx={{
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 700,
                fontSize: "0.95rem",
                minHeight: 44,
                px: 2,
              },
            }}
          >
            <Tab
              icon={<FormatListNumberedRoundedIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label="Registro de Conteos en Vivo"
            />
            <Tab
              icon={<HistoryRoundedIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label="Historial de Cierres Diarios"
            />
            <Tab
              icon={<AssessmentRoundedIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label="Capacidad y Galpones"
            />
          </Tabs>
        </Box>

        {/* Tab 0: Conteos */}
        {activeTab === 0 && (
          <CountsTable
            counts={counts}
            galpones={galpones}
            categorias={categorias}
          />
        )}

        {/* Tab 1: Cierres Diarios */}
        {activeTab === 1 && (
          <ClosuresTable
            cierres={cierres}
            galpones={galpones}
            categorias={categorias}
            onOpenDailyCloseModal={() => setDailyCloseModalOpen(true)}
            canPerformClose={canPerformActions}
          />
        )}

        {/* Tab 2: Galpones Overview */}
        {activeTab === 2 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" },
                gap: 2,
              }}
            >
              {galpones.map((g) => {
                const galponCounts = counts.filter(
                  (c) =>
                    c.idGalpon === g.id &&
                    c.timestamp.slice(0, 10) === new Date().toISOString().slice(0, 10)
                )
                const eggsToday = galponCounts.reduce((acc, c) => acc + c.cantidad, 0)
                const posturaPct =
                  g.gallinasActuales > 0 ? ((eggsToday / g.gallinasActuales) * 100).toFixed(1) : "0"

                return (
                  <Box
                    key={g.id}
                    sx={{
                      p: 2,
                      borderRadius: 1.25,
                      border: "1px solid",
                      borderColor: "divider",
                      bgcolor: "background.paper",
                    }}
                  >
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        {g.nombre}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          px: 1,
                          py: 0.2,
                          borderRadius: 0.8,
                          fontWeight: 700,
                          bgcolor: g.estado === "activo" ? "#dcfce7" : "#fee2e2",
                          color: g.estado === "activo" ? "#166534" : "#991b1b",
                        }}
                      >
                        {g.estado.toUpperCase()}
                      </Typography>
                    </Box>

                    <Typography variant="body2" sx={{ color: "text.secondary", mb: 1.2 }}>
                      Capacidad actual: <strong>{g.gallinasActuales.toLocaleString()}</strong> gallinas
                    </Typography>

                    <Box sx={{ p: 1.2, borderRadius: 1, bgcolor: "#faf7f2", mb: 1.2 }}>
                      <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                        Producción de Hoy
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 800, color: "text.primary" }}>
                        {eggsToday.toLocaleString()} uds{" "}
                        <Typography component="span" variant="caption" sx={{ color: "text.secondary" }}>
                          ({Math.floor(eggsToday / 30)} bandejas)
                        </Typography>
                      </Typography>
                    </Box>

                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        Postura estimada:
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: "#16a34a" }}>
                        {posturaPct}%
                      </Typography>
                    </Box>
                  </Box>
                )
              })}
            </Box>
          </Box>
        )}
      </Box>

      {/* Modals */}
      <RegisterCountDialog
        open={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        onRegister={handleRegisterCount}
        galpones={galpones}
        categorias={categorias}
        initialGalponId={typeof selectedGalponId === "number" ? selectedGalponId : undefined}
        initialCategory={preselectedCategory}
      />

      <DailyCloseDialog
        open={dailyCloseModalOpen}
        onClose={() => setDailyCloseModalOpen(false)}
        onCloseDaily={handleDailyClose}
        galpones={galpones}
        counts={counts}
      />

      {/* Toast feedback */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          severity={toast.severity}
          variant="filled"
          sx={{ width: "100%", borderRadius: 1, fontWeight: 600 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
