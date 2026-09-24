import { useState } from "react"
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import IconButton from "@mui/material/IconButton"
import Typography from "@mui/material/Typography"
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded"
import BackspaceRoundedIcon from "@mui/icons-material/BackspaceRounded"
import type { SalidaCategory } from "./types"

interface QuantityScreenProps {
  category: SalidaCategory
  initialQuantity: number
  onBack: () => void
  onConfirm: (quantity: number) => void
}

export default function QuantityScreen({ category, initialQuantity, onBack, onConfirm }: QuantityScreenProps) {
  const [quantityText, setQuantityText] = useState(initialQuantity > 0 ? String(initialQuantity) : "")
  const quantity = Number(quantityText) || 0
  const maximum = category.cantidadBandejasDisponibles
  const invalid = quantity < 1 || quantity > maximum

  const appendDigit = (digit: number) => {
    const next = `${quantityText}${digit}`.replace(/^0+(?=\d)/, "")
    if (Number(next) <= maximum) setQuantityText(next)
  }

  const removeDigit = () => setQuantityText((value) => value.slice(0, -1))

  return (
    <Box sx={{ minHeight: "100%", bgcolor: "background.default", p: { xs: 2, sm: 3 } }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
        <IconButton aria-label="Volver al pedido" onClick={onBack} size="small"><ArrowBackRoundedIcon /></IconButton>
        <Box>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800 }}>Registrar salida</Typography>
          <Typography variant="h5">Cantidad de {category.nombre}</Typography>
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>Disponible: {maximum} bandejas.</Alert>
      {invalid && quantity > maximum && <Alert severity="error" sx={{ mb: 2 }}>La cantidad supera el stock disponible.</Alert>}

      <Box sx={{ textAlign: "center", mb: 3 }}>
        <Typography variant="h2" sx={{ fontWeight: 900 }}>{quantityText || "0"}</Typography>
        <Typography color="text.secondary">bandejas</Typography>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, maxWidth: 360, mx: "auto" }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
          <Button key={digit} variant="outlined" onClick={() => appendDigit(digit)} sx={{ minHeight: 64, fontSize: "1.4rem" }}>{digit}</Button>
        ))}
        <Box />
        <Button variant="outlined" onClick={() => appendDigit(0)} sx={{ minHeight: 64, fontSize: "1.4rem" }}>0</Button>
        <Button variant="outlined" color="inherit" onClick={removeDigit} sx={{ minHeight: 64 }} aria-label="Borrar último dígito"><BackspaceRoundedIcon /></Button>
      </Box>

      <Button fullWidth variant="contained" disabled={invalid} onClick={() => onConfirm(quantity)} sx={{ mt: 3 }}>
        Agregar al pedido
      </Button>
    </Box>
  )
}
