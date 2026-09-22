import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import Alert from "@mui/material/Alert"
import Avatar from "@mui/material/Avatar"
import Box from "@mui/material/Box"
import CircularProgress from "@mui/material/CircularProgress"
import IconButton from "@mui/material/IconButton"
import List from "@mui/material/List"
import ListItemButton from "@mui/material/ListItemButton"
import ListItemIcon from "@mui/material/ListItemIcon"
import ListItemText from "@mui/material/ListItemText"
import Paper from "@mui/material/Paper"
import Stack from "@mui/material/Stack"
import Typography from "@mui/material/Typography"
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded"
import EggAltRoundedIcon from "@mui/icons-material/EggAltRounded"
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined"
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded"
import MenuRoundedIcon from "@mui/icons-material/MenuRounded"
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded"
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded"
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined"
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded"
import { useAuthStore } from "./stores/authStore"
import { listProductionCounts, type ProductionCount } from "./services/productionService"
import type { Role } from "./services/authService"

const drawerWidth = 260

type Module = {
  label: string
  icon: typeof DashboardRoundedIcon
  permission?: string
}

const modules: Module[] = [
  { label: "Resumen", icon: DashboardRoundedIcon },
  { label: "Monitoreo de conteo", icon: EggAltRoundedIcon, permission: "VER_PRODUCCION" },
  { label: "Producción", icon: TrendingUpRoundedIcon, permission: "VER_PRODUCCION" },
  { label: "Inventario", icon: Inventory2OutlinedIcon, permission: "EDITAR_INVENTARIO" },
  { label: "Ventas", icon: ShoppingCartOutlinedIcon, permission: "INGRESAR_PEDIDO" },
]

function formatTime(timestamp: string): string {
  return new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit" }).format(new Date(timestamp))
}

function initials(user: string | null): string {
  return user?.slice(0, 2).toUpperCase() ?? "SA"
}

function Metric({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <Paper elevation={0} sx={{ p: 2.5, border: "1px solid", borderColor: "divider", borderLeft: `5px solid ${accent}`, borderRadius: 2.5, backgroundColor: "background.paper" }}>
      <Typography variant="body2">{label}</Typography>
      <Typography variant="h4" sx={{ mt: 0.75, fontWeight: 800 }}>{value}</Typography>
    </Paper>
  )
}

function MonitoringView({ token }: { token: string | null }) {
  const [counts, setCounts] = useState<ProductionCount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadCounts = async () => {
    if (!token) return
    try {
      setError(null)
      setCounts(await listProductionCounts(token))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el monitoreo")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadCounts()
    const interval = window.setInterval(() => void loadCounts(), 10000)
    return () => window.clearInterval(interval)
  }, [token])

  const totalCount = useMemo(() => counts.reduce((total, count) => total + count.cantidad, 0), [counts])
  const activeSheds = useMemo(() => new Set(counts.map((count) => count.idGalpon)).size, [counts])
  const latestCounts = counts.slice(0, 8)

  return (
    <Stack spacing={3}>
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, justifyContent: "space-between", alignItems: { sm: "center" }, gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ color: "text.primary", fontWeight: 800 }}>Monitoreo en vivo</Typography>
          <Typography sx={{ color: "text.secondary", mt: 0.5 }}>Conteo de producción por galpón, actualizado automáticamente.</Typography>
        </Box>
        <IconButton onClick={() => void loadCounts()} aria-label="Actualizar monitoreo" sx={{ color: "primary.dark", alignSelf: { xs: "flex-start", sm: "auto" } }}>
          <RefreshRoundedIcon />
        </IconButton>
      </Box>

      {error && <Alert severity="warning">{error}</Alert>}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 2 }}>
        <Metric label="Huevos registrados" value={totalCount.toLocaleString("es-CO")} accent="#e77978" />
        <Metric label="Galpones activos" value={activeSheds.toString()} accent="#eaa66f" />
        <Metric label="Últimos registros" value={counts.length.toString()} accent="#b9a16b" />
      </Box>

      <Paper elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3, overflow: "hidden", backgroundColor: "background.paper" }}>
        <Box sx={{ px: { xs: 2, md: 3 }, py: 2, borderBottom: "1px solid", borderColor: "divider" }}>
          <Typography variant="h6">Actividad reciente</Typography>
          <Typography variant="body2">Los últimos conteos recibidos desde los dispositivos.</Typography>
        </Box>
        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress size={28} /></Box>
        ) : latestCounts.length === 0 ? (
          <Box sx={{ px: 3, py: 8, textAlign: "center" }}>
            <EggAltRoundedIcon sx={{ fontSize: 42, color: "primary.light", mb: 1 }} />
            <Typography variant="h6">Esperando el primer conteo</Typography>
            <Typography variant="body2">Cuando llegue información de un galpón, aparecerá aquí.</Typography>
          </Box>
        ) : (
          <Stack divider={<Box sx={{ borderBottom: "1px solid", borderColor: "divider" }} />}>
            {latestCounts.map((count) => (
              <Box key={count.id} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr auto", sm: "1fr 1fr 0.7fr 0.5fr" }, gap: 2, alignItems: "center", px: { xs: 2, md: 3 }, py: 2 }}>
                <Box><Typography sx={{ fontWeight: 700 }}>{count.galpon.nombre}</Typography><Typography variant="body2">{count.categoriaPeso.nombre}</Typography></Box>
                <Typography sx={{ display: { xs: "none", sm: "block" }, color: "text.secondary" }}>{new Date(count.timestamp).toLocaleDateString("es-CO")}</Typography>
                <Typography sx={{ color: "text.secondary", textAlign: { sm: "right" } }}>{formatTime(count.timestamp)}</Typography>
                <Typography sx={{ color: "primary.dark", fontWeight: 800, textAlign: "right" }}>+{count.cantidad}</Typography>
              </Box>
            ))}
          </Stack>
        )}
      </Paper>
    </Stack>
  )
}

export default function App() {
  const { user, role, permissions, token, logout } = useAuthStore()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const visibleModules = modules.filter((module) => !module.permission || permissions.includes(module.permission))

  const handleLogout = () => {
    logout()
    navigate("/login", { replace: true })
  }

  return (
    <Box sx={{ minHeight: "100dvh", display: "flex", backgroundColor: "background.default", color: "text.primary" }}>
      <Box component="aside" sx={{ width: drawerWidth, flexShrink: 0, display: { xs: mobileOpen ? "block" : "none", md: "block" }, position: { xs: "fixed", md: "relative" }, zIndex: 3, minHeight: "100dvh", backgroundColor: "#fffdf9", borderRight: "1px solid", borderColor: "divider" }}>
        <Box sx={{ height: 82, px: 3, display: "flex", alignItems: "center", borderBottom: "1px solid", borderColor: "divider" }}><Typography variant="h6" sx={{ color: "#8c542f", fontWeight: 900, letterSpacing: 1 }}>SAMAVI</Typography></Box>
        <Box sx={{ p: 2 }}>
          <Typography variant="overline" sx={{ px: 1.5, color: "text.disabled", fontWeight: 700 }}>Módulos</Typography>
          <List sx={{ mt: 1 }}>{visibleModules.map((module, index) => { const Icon = module.icon; return <ListItemButton key={module.label} selected={index === 0} onClick={() => setMobileOpen(false)} sx={{ mb: 0.5, borderRadius: 2, color: "text.secondary", "&.Mui-selected": { color: "primary.dark", backgroundColor: "primary.light" }, "&.Mui-selected:hover": { backgroundColor: "primary.light" } }}><ListItemIcon sx={{ minWidth: 40, color: "inherit" }}><Icon fontSize="small" /></ListItemIcon><ListItemText primary={module.label} /></ListItemButton> })}</List>
        </Box>
        <Box sx={{ position: "absolute", bottom: 20, left: 16, right: 16 }}><ListItemButton onClick={handleLogout} sx={{ borderRadius: 2, color: "text.secondary" }}><ListItemIcon sx={{ minWidth: 40, color: "inherit" }}><LogoutRoundedIcon fontSize="small" /></ListItemIcon><ListItemText primary="Cerrar sesión" /></ListItemButton></Box>
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box component="header" sx={{ height: 82, px: { xs: 2, md: 4 }, display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "background.paper", borderBottom: "1px solid", borderColor: "divider" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}><IconButton onClick={() => setMobileOpen((open) => !open)} sx={{ display: { md: "none" }, color: "text.primary" }} aria-label="Abrir navegación"><MenuRoundedIcon /></IconButton><Box><Typography variant="body2">Panel de administración</Typography><Typography sx={{ fontWeight: 800 }}>Centro de operaciones</Typography></Box></Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}><IconButton aria-label="Notificaciones" sx={{ color: "text.secondary" }}><NotificationsNoneRoundedIcon /></IconButton><Avatar sx={{ width: 38, height: 38, bgcolor: "primary.light", color: "primary.dark", fontWeight: 800 }}>{initials(user)}</Avatar><Box sx={{ display: { xs: "none", sm: "block" } }}><Typography sx={{ fontWeight: 700, lineHeight: 1.2 }}>{user ?? "Usuario"}</Typography><Typography variant="body2">{role ?? "Invitado"}</Typography></Box></Box>
        </Box>
        <Box component="main" sx={{ p: { xs: 2, sm: 3, md: 5 }, maxWidth: 1440, margin: "0 auto" }}><MonitoringView token={token} /></Box>
      </Box>
    </Box>
  )
}
