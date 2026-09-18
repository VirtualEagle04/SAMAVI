//import { useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { T } from "./tokens"
//import StockScreen from "./features/bodega/StockScreen"
//import BodegaFlow from "./features/bodega/BodegaFlow"
//import AdminScreen from "./features/admin/AdminScreen"
//import ClasificacionScreen from "./features/clasificacion/ClasificacionScreen"
//import GalponScreen from "./features/galpon/GalponScreen"
import { useAuthStore } from "./stores/authStore"

// Top-level flows
type Flow = "home" | "bodega" | "admin" | "clasificacion" | "galpon"


// ── iPhone 16 shell ────────────────────────────────────────────────────────
function PhoneShell({ children, onLogout }: { children: React.ReactNode; onLogout?: () => void }) {
  return (
    <div style={{ width: "100%", height: "100%", background: "#E5E5EA", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "-apple-system, 'SF Pro Text', 'Inter', system-ui, sans-serif" }}>
      <div style={{ width: 393, height: 852, background: T.bg, borderRadius: 54, overflow: "hidden", position: "relative", boxShadow: "0 0 0 1px rgba(0,0,0,0.08), 0 28px 72px rgba(0,0,0,0.2), 0 4px 16px rgba(0,0,0,0.1)" }}>

        {/* Status bar */}
        <div style={{ height: 54, background: T.bg, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 28px 0", position: "relative", zIndex: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: T.text }}>9:41</span>
          <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", top: 12, width: 120, height: 30, background: T.text, borderRadius: 99 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {onLogout && (
              <button
                onClick={onLogout}
                aria-label="Cerrar sesión"
                style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", alignItems: "center", color: T.label }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            )}
            <svg width="17" height="12" viewBox="0 0 17 12" fill={T.text}>
              <rect x="0" y="4" width="3" height="8" rx="0.5" />
              <rect x="4.5" y="2.5" width="3" height="9.5" rx="0.5" />
              <rect x="9" y="1" width="3" height="11" rx="0.5" />
              <rect x="13.5" y="0" width="3" height="12" rx="0.5" />
            </svg>
            <div style={{ width: 25, height: 13, borderRadius: 4, border: `1.5px solid ${T.text}`, padding: "1.5px 2px", display: "flex", alignItems: "center" }}>
              <div style={{ width: "75%", height: "100%", background: T.text, borderRadius: 2 }} />
            </div>
          </div>
        </div>

        {/* Screen content */}
        <div style={{ position: "absolute", top: 54, bottom: 0, left: 0, right: 0, overflow: "hidden" }}>
          {children}
        </div>

        {/* Home indicator */}
        <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
          <div style={{ width: 134, height: 5, borderRadius: 99, background: "rgba(0,0,0,0.18)" }} />
        </div>
      </div>
    </div>
  )
}

// ── Root — router only ─────────────────────────────────────────────────────
interface AppProps {
  initialFlow?: Flow
}

export default function App({ initialFlow: _initialFlow }: AppProps) {
  const { logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate("/login", { replace: true })
  }

  return (
    <PhoneShell onLogout={handleLogout}>
      <div style={{ padding: 32 }}>
        Módulos pendientes de implementación
      </div>

      {/*
      {flow === "home" && (
        <StockScreen
          onStartOrder={() => setFlow("bodega")}
          onAdmin={() => setFlow("admin")}
          onClasificacion={() => setFlow("clasificacion")}
          onGalpon={() => setFlow("galpon")}
        />
      )}

      {flow === "bodega" && <BodegaFlow onExit={goHome} />}
      {flow === "admin" && <AdminScreen onBack={goHome} />}
      {flow === "clasificacion" && <ClasificacionScreen onBack={goHome} />}
      {flow === "galpon" && <GalponScreen onBack={goHome} />}
      */}
    </PhoneShell>
  )
}
