import { Routes, Route, Navigate } from "react-router-dom"
import LoginPage from "./features/auth/pages/LoginPage"
import App from "./App"

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<App />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
