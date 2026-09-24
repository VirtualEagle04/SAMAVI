import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import Avatar from "@mui/material/Avatar"
import Box from "@mui/material/Box"
import Drawer from "@mui/material/Drawer"
import IconButton from "@mui/material/IconButton"
import List from "@mui/material/List"
import ListItemButton from "@mui/material/ListItemButton"
import ListItemIcon from "@mui/material/ListItemIcon"
import ListItemText from "@mui/material/ListItemText"
import Typography from "@mui/material/Typography"
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded"
import MenuRoundedIcon from "@mui/icons-material/MenuRounded"
import PrecisionManufacturingRoundedIcon from "@mui/icons-material/PrecisionManufacturingRounded"
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded"
import { useAuthStore } from "./stores/authStore"
import ProduccionPage from "./features/produccion/pages/ProduccionPage"
import samanLogo from "./assets/saman_logo.png"

const drawerWidth = 260

function initials(user: string | null): string {
  return user?.slice(0, 2).toUpperCase() ?? "SA"
}

export default function App() {
  const { user, role, permissions, isAuthenticated, logout } = useAuthStore()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Module RBAC checks
  const canAccessProduccion =
    role === "Administrador" ||
    role === "Galponero" ||
    permissions.includes("VER_PRODUCCION")

  const canAccessComercial =
    role === "Administrador" ||
    role === "Vendedor" ||
    permissions.includes("INGRESAR_PEDIDO") ||
    permissions.includes("REGISTRAR_VENTA")

  // Active module state based on permissions
  const [activeModule, setActiveModule] = useState<string>(
    canAccessProduccion ? "produccion" : canAccessComercial ? "comercial" : "overview"
  )

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true })
    }
  }, [isAuthenticated, navigate])

  const handleLogout = () => {
    logout()
    navigate("/login", { replace: true })
  }

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev)
  }

  const navItems = [
    ...(canAccessProduccion
      ? [
          {
            id: "produccion",
            label: "Producción",
            icon: <PrecisionManufacturingRoundedIcon fontSize="small" />,
          },
        ]
      : []),
    ...(canAccessComercial
      ? [
          {
            id: "comercial",
            label: "Comercial / Ventas",
            icon: <StorefrontRoundedIcon fontSize="small" />,
          },
        ]
      : []),
  ]

  const sidebarContent = (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: "background.paper",
        borderRight: "1px solid",
        borderColor: "divider",
      }}
    >
      <Box
        sx={{
          height: 72,
          px: 3,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box
          component="img"
          src={samanLogo}
          alt="SAMAVI Logo"
          sx={{ height: 48, width: "auto" }}
        />
        <Typography
          variant="h6"
          sx={{
            color: "primary.dark",
            fontWeight: 900,
            letterSpacing: 1.5,
          }}
        >
          SAMAVI
        </Typography>
      </Box>

      {/* Navigation Area with RBAC Filtered Modules */}
      <Box sx={{ flex: 1, p: 2, overflowY: "auto" }}>
        <Typography
          variant="caption"
          sx={{
            px: 1.5,
            py: 1,
            display: "block",
            fontWeight: 800,
            color: "text.secondary",
            letterSpacing: 0.5,
            textTransform: "uppercase",
            fontSize: "0.75rem",
          }}
        >
          Módulos
        </Typography>
        <List disablePadding sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          {navItems.map((item) => {
            const isSelected = activeModule === item.id
            return (
              <ListItemButton
                key={item.id}
                selected={isSelected}
                onClick={() => {
                  setActiveModule(item.id)
                  setMobileOpen(false)
                }}
                sx={{
                  borderRadius: 1,
                  py: 1,
                  px: 1.8,
                  color: isSelected ? "primary.dark" : "text.secondary",
                  backgroundColor: isSelected ? "primary.light" : "transparent",
                  "&:hover": {
                    backgroundColor: isSelected ? "primary.light" : "rgba(231, 121, 120, 0.08)",
                    color: "primary.dark",
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 36,
                    color: isSelected ? "primary.dark" : "inherit",
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography
                      sx={{
                        fontSize: "0.95rem",
                        fontWeight: isSelected ? 800 : 600,
                      }}
                    >
                      {item.label}
                    </Typography>
                  }
                />
              </ListItemButton>
            )
          })}
        </List>
      </Box>

      {/* Footer Section */}
      <Box
        sx={{
          p: 2,
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <ListItemButton
          onClick={handleLogout}
          sx={{
            borderRadius: 1,
            color: "text.secondary",
            "&:hover": {
              backgroundColor: "primary.light",
              color: "primary.dark",
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 40, color: "inherit" }}>
            <LogoutRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary={
              <Typography sx={{ fontSize: "0.95rem", fontWeight: 600 }}>
                Cerrar sesión
              </Typography>
            }
          />
        </ListItemButton>
      </Box>
    </Box>
  )

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        backgroundColor: "background.default",
        color: "text.primary",
      }}
    >
      {/* Sidebar Desktop */}
      <Box
        component="nav"
        sx={{
          width: { md: drawerWidth },
          flexShrink: { md: 0 },
        }}
      >
        {/* Mobile Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
        >
          {sidebarContent}
        </Drawer>

        {/* Permanent Desktop Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
              border: "none",
            },
          }}
          open
        >
          {sidebarContent}
        </Drawer>
      </Box>

      {/* Main Container */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        {/* Topbar */}
        <Box
          component="header"
          sx={{
            height: 72,
            px: { xs: 2, md: 4 },
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "background.paper",
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <IconButton
              onClick={handleDrawerToggle}
              sx={{ display: { md: "none" }, color: "text.primary" }}
              aria-label="Abrir menú de navegación"
            >
              <MenuRoundedIcon />
            </IconButton>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "text.primary" }}>
              {activeModule === "produccion"
                ? "Módulo de Producción"
                : activeModule === "comercial"
                ? "Módulo Comercial"
                : "Panel Principal"}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar
              sx={{
                width: 40,
                height: 40,
                bgcolor: "primary.light",
                color: "primary.dark",
                fontWeight: 800,
                fontSize: "0.95rem",
              }}
            >
              {initials(user)}
            </Avatar>
            <Box sx={{ display: { xs: "none", sm: "block" } }}>
              <Typography sx={{ fontWeight: 700, lineHeight: 1.2, fontSize: "0.95rem" }}>
                {user ?? "Usuario"}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
                {role ?? "Invitado"}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Main Content */}
        <Box
          component="main"
          sx={{
            flex: 1,
            p: { xs: 2, sm: 3, md: 4 },
            maxWidth: 1400,
            width: "100%",
            mx: "auto",
            boxSizing: "border-box",
          }}
        >
          {activeModule === "produccion" && <ProduccionPage />}
          {activeModule === "comercial" && (
            <Box sx={{ p: 4, textAlign: "center", bgcolor: "background.paper", borderRadius: 1.5, border: "1px solid", borderColor: "divider" }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Módulo Comercial en Preparación
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
                Selecciona el módulo de producción en el menú lateral.
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  )
}
