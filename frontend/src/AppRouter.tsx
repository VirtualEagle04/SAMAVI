import { useEffect, useState } from "react"
import { Routes, Route, Navigate, useNavigate } from "react-router-dom"
import LoginPage from "./features/auth/pages/LoginPage"
import GalponScreen from "./features/captura_movil/pages/galpones/GalponScreen"
import MainStockScreen from "./features/captura_movil/pages/MainStockScreen"
import RegistrarSalidaFlow from "./features/captura_movil/pages/registrar-salida/registrarSalidaFlow"
import ClasificarHuevosScreen from "./features/captura_movil/pages/clasificar-huevos/ClasificarHuevosScreen"
import RoleRoute from "./routing/RoleRoute"
import { getDefaultRouteForRole } from "./routing/roleRouting"
import { useAuthStore } from "./stores/authStore"
import { getGalpones } from "./features/produccion/services/produccionService"
import type { CapturaGalpon } from "./features/captura_movil/types/captura.types"
import App from "./App"

function GalponRoute() {
  const navigate = useNavigate()
  const [galpones, setGalpones] = useState<CapturaGalpon[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    getGalpones()
      .then((data) => {
        if (!isMounted) return
        setGalpones(data.map((galpon) => ({
          id: galpon.id,
          nombre: galpon.nombre,
          raza: null,
          aves: galpon.gallinasActuales,
          estado: galpon.estado,
          alimentacionHoy: false,
        })))
      })
      .catch((loadError) => {
        if (isMounted) setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los galpones")
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <RoleRoute allowedRoles={["Administrador", "Galponero"]}>
      <GalponScreen
        galpones={galpones}
        isLoading={isLoading}
        error={error}
        onBack={() => navigate("/stock")}
      />
    </RoleRoute>
  )
}

function StockRoute() {
  const navigate = useNavigate()
  const { logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate("/login", { replace: true })
  }

  return (
    <RoleRoute allowedRoles={["Administrador", "Galponero"]}>
      <MainStockScreen
        onRegistrarSalida={() => navigate("/captura/salida-inventario")}
        onClasificacion={() => navigate("/captura/clasificar-huevos")}
        onGalpon={() => navigate("/galpon")}
        onLogout={handleLogout}
      />
    </RoleRoute>
  )
}

function SalidaInventarioRoute() {
  const navigate = useNavigate()

  return (
    <RoleRoute allowedRoles={["Administrador", "Galponero"]}>
      <RegistrarSalidaFlow clients={[]} categories={[]} onBack={() => navigate("/stock")} />
    </RoleRoute>
  )
}

function ClasificarHuevosRoute() {
  const navigate = useNavigate()

  return (
    <RoleRoute allowedRoles={["Administrador", "Galponero"]}>
      <ClasificarHuevosScreen onBack={() => navigate("/stock")} />
    </RoleRoute>
  )
}

function RoleLandingRoute() {
  const { role } = useAuthStore()

  return role ? <Navigate to={getDefaultRouteForRole(role)} replace /> : <Navigate to="/login" replace />
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <RoleRoute>
            <App />
          </RoleRoute>
        }
      />
      <Route path="/galpon" element={<GalponRoute />} />
      <Route path="/stock" element={<StockRoute />} />
      <Route path="/captura/salida-inventario" element={<SalidaInventarioRoute />} />
      <Route path="/captura/clasificar-huevos" element={<ClasificarHuevosRoute />} />
      <Route path="*" element={<RoleLandingRoute />} />
    </Routes>
  )
}
