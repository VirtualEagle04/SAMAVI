import { Routes, Route, Navigate } from "react-router-dom"
import LoginPage from "./features/auth/pages/LoginPage"
import RequireAuth from "./features/auth/components/RequireAuth"
import RequireModule from "./features/auth/components/RequireModule"
import DefaultModuleRedirect from "./features/auth/components/DefaultModuleRedirect"
import DashboardPage from "./features/dashboard/pages/DashboardPage"
import ConsolidacionPage from "./features/consolidacion/pages/ConsolidacionPage"
import ProduccionPage from "./features/produccion/pages/ProduccionPage"
import ComercialPage from "./features/comercial/pages/ComercialPage"
import GalponesPage from "./features/galpones/pages/GalponesPage"
import GalponDetallePage from "./features/galpones/pages/GalponDetallePage"
import InventarioPage from "./features/inventario/pages/InventarioPage"
import AuditoriaPage from "./features/auditoria/pages/AuditoriaPage"
import App from "./App"

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        {/* Shell (sidebar + header); cada módulo se renderiza en su <Outlet /> */}
        <Route element={<App />}>
          <Route index element={<DefaultModuleRedirect />} />
          <Route element={<RequireModule module="dashboard" />}>
            <Route path="dashboard" element={<DashboardPage />} />
          </Route>
          <Route element={<RequireModule module="consolidacion" />}>
            <Route path="consolidacion" element={<ConsolidacionPage />} />
          </Route>
          <Route element={<RequireModule module="produccion" />}>
            <Route path="produccion" element={<ProduccionPage />} />
          </Route>
          <Route element={<RequireModule module="comercial" />}>
            <Route path="comercial" element={<ComercialPage />} />
          </Route>
          <Route element={<RequireModule module="galpones" />}>
            <Route path="galpones">
              <Route index element={<GalponesPage />} />
              <Route path=":id" element={<GalponDetallePage />} />
              <Route path="*" element={<Navigate to="/galpones" replace />} />
            </Route>
          </Route>
          <Route element={<RequireModule module="inventario" />}>
            <Route path="inventario" element={<InventarioPage />} />
          </Route>
          <Route element={<RequireModule module="auditoria" />}>
            <Route path="auditoria" element={<AuditoriaPage />} />
          </Route>
          {/* Rutas desconocidas o heredadas */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}
