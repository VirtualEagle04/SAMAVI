import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Card from "@mui/material/Card"
import Divider from "@mui/material/Divider"
import IconButton from "@mui/material/IconButton"
import Typography from "@mui/material/Typography"
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded"
import type { SalidaCartItem, SalidaClient } from "./types"

interface ConfirmScreenProps {
  client: SalidaClient
  cart: SalidaCartItem[]
  onBack: () => void
  onConfirm: () => void
}

export default function ConfirmScreen({ client, cart, onBack, onConfirm }: ConfirmScreenProps) {
  const totalTrays = cart.reduce((sum, item) => sum + item.cantidadBandejas, 0)

  return (
    <Box sx={{ minHeight: "100%", bgcolor: "background.default", p: { xs: 2, sm: 3 } }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
        <IconButton aria-label="Volver al pedido" onClick={onBack} size="small"><ArrowBackRoundedIcon /></IconButton>
        <Box>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800 }}>Registrar salida</Typography>
          <Typography variant="h5">Confirmar salida</Typography>
        </Box>
      </Box>

      {cart.length === 0 && <Alert severity="warning" sx={{ mb: 2 }}>No puedes confirmar una salida sin productos.</Alert>}

      <Card variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="overline" color="text.secondary">Cliente</Typography>
        <Typography sx={{ fontWeight: 800 }}>{client.nombre}</Typography>
        {client.empresa && <Typography variant="body2" color="text.secondary">{client.empresa}</Typography>}
        {client.telefono && <Typography variant="body2" color="text.secondary">{client.telefono}</Typography>}
      </Card>

      <Card variant="outlined" sx={{ mb: 3 }}>
        {cart.map((item, index) => (
          <Box key={item.categoria.codigo} sx={{ p: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography sx={{ fontWeight: 700 }}>{item.categoria.nombre}</Typography>
              <Typography sx={{ fontWeight: 800 }}>{item.cantidadBandejas} bdj.</Typography>
            </Box>
            {index < cart.length - 1 && <Divider sx={{ mt: 2 }} />}
          </Box>
        ))}
        <Box sx={{ p: 2, bgcolor: "action.hover", display: "flex", justifyContent: "space-between" }}>
          <Typography sx={{ fontWeight: 800 }}>Total salida</Typography>
          <Typography color="primary" sx={{ fontWeight: 900 }}>{totalTrays} bdj.</Typography>
        </Box>
      </Card>

      <Button fullWidth variant="contained" disabled={cart.length === 0} onClick={onConfirm}>Confirmar salida</Button>
    </Box>
  )
}
