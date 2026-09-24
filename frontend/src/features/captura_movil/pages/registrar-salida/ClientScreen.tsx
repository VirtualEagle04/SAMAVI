import { useState } from "react"
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Card from "@mui/material/Card"
import CircularProgress from "@mui/material/CircularProgress"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogTitle from "@mui/material/DialogTitle"
import IconButton from "@mui/material/IconButton"
import Stack from "@mui/material/Stack"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import AddRoundedIcon from "@mui/icons-material/AddRounded"
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded"
import PersonRoundedIcon from "@mui/icons-material/PersonRounded"
import type { ManualClientDraft, SalidaClient } from "./types"

interface ClientScreenProps {
  clients: SalidaClient[]
  isLoading?: boolean
  error?: string | null
  onBack: () => void
  onSelect: (client: SalidaClient) => void
  onRefresh?: () => void
}

export default function ClientScreen({ clients, isLoading = false, error = null, onBack, onSelect, onRefresh }: ClientScreenProps) {
  const [manualOpen, setManualOpen] = useState(false)
  const [manualClient, setManualClient] = useState<ManualClientDraft>({ nombre: "", empresa: "", telefono: "" })
  const [manualError, setManualError] = useState<string | null>(null)

  const handleManualSubmit = () => {
    if (!manualClient.nombre.trim() || !manualClient.telefono.trim()) {
      setManualError("El nombre y el teléfono son obligatorios.")
      return
    }

    onSelect({
      id: `manual-${Date.now()}`,
      nombre: manualClient.nombre.trim(),
      empresa: manualClient.empresa.trim() || undefined,
      telefono: manualClient.telefono.trim(),
    })
    setManualOpen(false)
    setManualClient({ nombre: "", empresa: "", telefono: "" })
    setManualError(null)
  }

  return (
    <Box sx={{ minHeight: "100%", bgcolor: "background.default", p: { xs: 2, sm: 3 } }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
        <IconButton aria-label="Volver a stock" onClick={onBack} size="small"><ArrowBackRoundedIcon /></IconButton>
        <Box>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800 }}>Registrar salida</Typography>
          <Typography variant="h5">Seleccionar cliente</Typography>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {onRefresh && <Button onClick={onRefresh} sx={{ mb: 2 }}>Actualizar clientes</Button>}
      {isLoading && <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>}
      {!isLoading && clients.length === 0 && <Alert severity="info" sx={{ mb: 2 }}>No hay clientes registrados. Puedes ingresar uno manualmente.</Alert>}

      {!isLoading && clients.length > 0 && (
        <Stack spacing={1.5} sx={{ mb: 3 }}>
          {clients.map((client) => (
            <Card key={client.id} component="button" type="button" variant="outlined" onClick={() => onSelect(client)} sx={{ p: 2, textAlign: "left", cursor: "pointer", "&:hover": { borderColor: "primary.main", boxShadow: 2 } }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <PersonRoundedIcon color="primary" />
                <Box>
                  <Typography sx={{ fontWeight: 800 }}>{client.nombre}</Typography>
                  {client.empresa && <Typography variant="body2" color="text.secondary">{client.empresa}</Typography>}
                  {client.telefono && <Typography variant="caption" color="text.secondary">{client.telefono}</Typography>}
                </Box>
              </Box>
            </Card>
          ))}
        </Stack>
      )}

      <Button fullWidth variant="outlined" startIcon={<AddRoundedIcon />} onClick={() => setManualOpen(true)}>
        Ingreso manual
      </Button>

      <Dialog open={manualOpen} onClose={() => setManualOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Ingreso manual de cliente</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {manualError && <Alert severity="error">{manualError}</Alert>}
            <TextField label="Nombre" value={manualClient.nombre} onChange={(event) => setManualClient((value) => ({ ...value, nombre: event.target.value }))} autoFocus />
            <TextField label="Empresa" value={manualClient.empresa} onChange={(event) => setManualClient((value) => ({ ...value, empresa: event.target.value }))} />
            <TextField label="Teléfono" value={manualClient.telefono} onChange={(event) => setManualClient((value) => ({ ...value, telefono: event.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setManualOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleManualSubmit}>Continuar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
