import { useState } from "react"
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Card from "@mui/material/Card"
import CircularProgress from "@mui/material/CircularProgress"
import Divider from "@mui/material/Divider"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogTitle from "@mui/material/DialogTitle"
import Typography from "@mui/material/Typography"
import AgricultureRoundedIcon from "@mui/icons-material/AgricultureRounded"
import AssignmentRoundedIcon from "@mui/icons-material/AssignmentRounded"
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded"
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded"
import type { StockItem } from "../types/captura.types"

interface StockScreenProps {
  stock?: StockItem[]
  isLoading?: boolean
  error?: string | null
  onClasificacion?: () => void
  onGalpon?: () => void
  onRegistrarSalida?: () => void
  onLogout?: () => void
}

function formatNumber(value: number): string {
  return value.toLocaleString("es-CO")
}

export default function StockScreen({
  stock = [],
  isLoading = false,
  error = null,
  onClasificacion,
  onGalpon,
  onRegistrarSalida,
  onLogout,
}: StockScreenProps) {
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)
  const totalBandejas = stock.reduce((sum, item) => sum + item.cantidadBandejas, 0)

  return (
    <Box sx={{ minHeight: "100%", bgcolor: "background.default", p: { xs: 2, sm: 3 } }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
        <Inventory2RoundedIcon color="primary" />
        <Box>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800 }}>Granja Avícola El Samán</Typography>
          <Typography variant="h5">Bodega central</Typography>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {isLoading && <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>}
      {!isLoading && stock.length === 0 && <Alert severity="info">No hay stock disponible para mostrar.</Alert>}

      {!isLoading && stock.length > 0 && (
        <>
          <Card variant="outlined" sx={{ p: 2, mb: 3 }}>
            <Typography variant="overline" color="text.secondary">Bandejas disponibles</Typography>
            <Typography variant="h3" sx={{ fontWeight: 900 }}>{formatNumber(totalBandejas)}</Typography>
          </Card>

          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800 }}>Detalle de stock</Typography>
          <Card variant="outlined" sx={{ mt: 1, mb: 3 }}>
            {stock.map((item, index) => (
              <Box key={item.codigo} sx={{ p: 2 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Box>
                    <Typography sx={{ fontWeight: 800 }}>{item.nombre}</Typography>
                    <Typography variant="body2" color="text.secondary">{item.codigo}</Typography>
                  </Box>
                  <Typography sx={{ fontWeight: 800 }}>{formatNumber(item.cantidadBandejas)} bdj.</Typography>
                </Box>
                {index < stock.length - 1 && <Divider sx={{ mt: 2 }} />}
              </Box>
            ))}
          </Card>
        </>
      )}

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {onRegistrarSalida && <Button variant="outlined" startIcon={<AssignmentRoundedIcon />} onClick={onRegistrarSalida}>Registrar salida de inventario</Button>}
        {onClasificacion && <Button variant="outlined" startIcon={<Inventory2RoundedIcon />} onClick={onClasificacion}>Clasificar huevos</Button>}
        {onGalpon && <Button variant="outlined" startIcon={<AgricultureRoundedIcon />} onClick={onGalpon}>Gestión de galpones</Button>}
        {onLogout && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<LogoutRoundedIcon />}
            onClick={() => setLogoutDialogOpen(true)}
          >
            Cerrar sesión
          </Button>
        )}
      </Box>

      <Dialog open={logoutDialogOpen} onClose={() => setLogoutDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>¿Cerrar sesión?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Tendrás que iniciar sesión nuevamente para volver a ingresar.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setLogoutDialogOpen(false)}>Cancelar</Button>
          <Button color="error" variant="contained" startIcon={<LogoutRoundedIcon />} onClick={onLogout}>
            Cerrar sesión
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
