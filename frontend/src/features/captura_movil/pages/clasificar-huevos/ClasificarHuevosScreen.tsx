import Box from "@mui/material/Box"
import IconButton from "@mui/material/IconButton"
import Typography from "@mui/material/Typography"
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded"

interface ClasificarHuevosScreenProps {
  onBack: () => void
}

export default function ClasificarHuevosScreen({ onBack }: ClasificarHuevosScreenProps) {
  return (
    <Box sx={{ minHeight: "100%", bgcolor: "#fff", p: { xs: 2, sm: 3 } }}>
      <IconButton aria-label="Volver a stock" onClick={onBack} size="small">
        <ArrowBackRoundedIcon />
      </IconButton>
      <Box sx={{ minHeight: "70vh", display: "grid", placeItems: "center", textAlign: "center" }}>
        <Typography variant="h5" color="text.secondary">Pendiente de implementar</Typography>
      </Box>
    </Box>
  )
}
