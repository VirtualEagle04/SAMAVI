import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded"
import Typography from "@mui/material/Typography"
import type { SalidaClient } from "./types"

interface FeedbackScreenProps {
  client: SalidaClient
  reference?: string
  onDone: () => void
}

export default function FeedbackScreen({ client, reference, onDone }: FeedbackScreenProps) {
  return (
    <Box sx={{ minHeight: "100%", bgcolor: "background.default", display: "grid", placeItems: "center", p: 3 }}>
      <Box sx={{ textAlign: "center", maxWidth: 420 }}>
        <CheckCircleRoundedIcon color="success" sx={{ fontSize: 76, mb: 2 }} />
        <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>Salida registrada</Typography>
        <Typography color="text.secondary">La salida para {client.nombre} quedó preparada correctamente.</Typography>
        {reference && <Typography variant="body2" sx={{ mt: 2 }}>Referencia: {reference}</Typography>}
        <Button fullWidth variant="contained" onClick={onDone} sx={{ mt: 4 }}>Volver a bodega</Button>
      </Box>
    </Box>
  )
}
