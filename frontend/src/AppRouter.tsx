import { Routes, Route, Navigate } from "react-router-dom"
import LoginPage from "./features/auth/pages/LoginPage"
import AppShell from "./App"

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin" element={<AppShell initialFlow="admin" />} />
      <Route path="/galpon" element={<AppShell initialFlow="galpon" />} />
      <Route path="/ventas" element={<AppShell initialFlow="bodega" />} />
      <Route path="/app" element={<AppShell initialFlow="home" />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
