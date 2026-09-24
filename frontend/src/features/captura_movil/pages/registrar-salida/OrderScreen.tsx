import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Card from "@mui/material/Card"
import Chip from "@mui/material/Chip"
import Divider from "@mui/material/Divider"
import IconButton from "@mui/material/IconButton"
import Typography from "@mui/material/Typography"
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded"
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded"
import type { SalidaCartItem, SalidaCategory, SalidaClient } from "./types"

interface OrderScreenProps {
  client: SalidaClient
  categories: SalidaCategory[]
  cart: SalidaCartItem[]
  onBack: () => void
  onSelectCategory: (category: SalidaCategory) => void
  onRemoveItem: (codigo: string) => void
  onProceed: () => void
}

export default function OrderScreen({ client, categories, cart, onBack, onSelectCategory, onRemoveItem, onProceed }: OrderScreenProps) {
  const totalTrays = cart.reduce((sum, item) => sum + item.cantidadBandejas, 0)
  const usedCategories = new Set(cart.map((item) => item.categoria.codigo))

  return (
    <Box sx={{ minHeight: "100%", bgcolor: "background.default", p: { xs: 2, sm: 3 } }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
        <IconButton aria-label="Volver a clientes" onClick={onBack} size="small"><ArrowBackRoundedIcon /></IconButton>
        <Box>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800 }}>Registrar salida</Typography>
          <Typography variant="h5">Pedido de {client.nombre}</Typography>
        </Box>
      </Box>

      {categories.length === 0 && <Alert severity="info">No hay categorías de stock disponibles.</Alert>}

      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800 }}>Categorías disponibles</Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)" }, gap: 1.5, mt: 1, mb: 3 }}>
        {categories.map((category) => {
          const selected = usedCategories.has(category.codigo)
          const unavailable = category.cantidadBandejasDisponibles <= 0
          return (
            <Button
              key={category.codigo}
              variant={selected ? "contained" : "outlined"}
              disabled={unavailable}
              onClick={() => onSelectCategory(category)}
              sx={{ minHeight: 100, display: "flex", flexDirection: "column", gap: 0.5 }}
            >
              <Typography sx={{ fontWeight: 900 }}>{category.codigo}</Typography>
              <Typography variant="caption">{category.nombre}</Typography>
              <Typography variant="caption">{unavailable ? "Sin stock" : `${category.cantidadBandejasDisponibles} bdj.`}</Typography>
            </Button>
          )
        })}
      </Box>

      {cart.length > 0 ? (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <Box sx={{ p: 2 }}>
            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800 }}>Resumen parcial</Typography>
          </Box>
          {cart.map((item, index) => (
            <Box key={item.categoria.codigo} sx={{ px: 2, py: 1.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography sx={{ fontWeight: 800 }}>{item.categoria.nombre}</Typography>
                  <Typography variant="body2" color="text.secondary">{item.cantidadBandejas} bandejas</Typography>
                </Box>
                <IconButton aria-label={`Eliminar ${item.categoria.nombre}`} onClick={() => onRemoveItem(item.categoria.codigo)} color="error" size="small"><DeleteOutlineRoundedIcon /></IconButton>
              </Box>
              {index < cart.length - 1 && <Divider sx={{ mt: 1.5 }} />}
            </Box>
          ))}
          <Box sx={{ p: 2, bgcolor: "action.hover", display: "flex", justifyContent: "space-between" }}>
            <Typography sx={{ fontWeight: 800 }}>Total</Typography>
            <Chip label={`${totalTrays} bandejas`} color="primary" />
          </Box>
        </Card>
      ) : (
        <Alert severity="info" sx={{ mb: 3 }}>Selecciona al menos una categoría para continuar.</Alert>
      )}

      <Button fullWidth variant="contained" disabled={cart.length === 0} onClick={onProceed}>Continuar al resumen</Button>
    </Box>
  )
}
