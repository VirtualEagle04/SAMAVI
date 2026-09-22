import { Routes, Route, Navigate } from "react-router-dom"
import LoginPage from "./features/auth/pages/LoginPage"
import AppShell from "./App"

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<AppShell />} />
      <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
      <Route path="/galpon" element={<Navigate to="/dashboard" replace />} />
      <Route path="/ventas" element={<Navigate to="/dashboard" replace />} />
      <Route path="/app" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
