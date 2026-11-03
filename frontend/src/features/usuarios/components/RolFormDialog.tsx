import { useMemo, useState } from "react"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Checkbox from "@mui/material/Checkbox"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogTitle from "@mui/material/DialogTitle"
import FormControlLabel from "@mui/material/FormControlLabel"
import FormGroup from "@mui/material/FormGroup"
import FormLabel from "@mui/material/FormLabel"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import FeedbackAlert from "../../../components/organisms/FeedbackAlert"
import type { Permiso, Rol, RolPayload } from "../types/usuarios.types"
import { agruparPorArea } from "./usuarios.labels"

type Props = {
  /** null: crear. */
  rol: Rol | null
  permisos: Permiso[]
  /** Permisos de la sesión: solo esos se pueden otorgar (el backend lo vuelve a comprobar). */
  permisosPropios: string[]
  onClose: () => void
  onSave: (data: RolPayload) => Promise<void>
}

export default function RolFormDialog({ rol, permisos, permisosPropios, onClose, onSave }: Props) {
  const [nombre, setNombre] = useState(rol?.nombre ?? "")
  const [seleccion, setSeleccion] = useState<Set<string>>(() => new Set(rol?.permisos ?? []))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<{ campo: "nombre" | null; message: string } | null>(null)

  const grupos = useMemo(() => agruparPorArea(permisos), [permisos])
  const propios = useMemo(() => new Set(permisosPropios), [permisosPropios])

  const toggle = (codigo: string) => {
    setSeleccion((current) => {
      const next = new Set(current)
      if (next.has(codigo)) next.delete(codigo)
      else next.add(codigo)
      return next
    })
  }

  const submit = async () => {
    if (nombre.trim().length < 2) { setError({ campo: "nombre", message: "El nombre debe tener al menos 2 caracteres." }); return }
    setSaving(true)
    setError(null)
    try {
      await onSave({ nombre: nombre.trim(), permisos: [...seleccion].sort() })
      onClose()
    } catch (e) {
      const message = e instanceof Error ? e.message : "No se pudo guardar el rol."
      setError({ campo: message.toLowerCase().includes("nombre") ? "nombre" : null, message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onClose={() => { if (!saving) onClose() }} fullWidth maxWidth="md" scroll="paper" aria-labelledby="rol-form-title">
      <DialogTitle id="rol-form-title" sx={{ fontWeight: 700 }}>{rol ? `Editar rol ${rol.nombre}` : "Nuevo rol"}</DialogTitle>
      <DialogContent dividers>
        <TextField
          label="Nombre del rol"
          value={nombre}
          onChange={(e) => setNombre(e.target.value.slice(0, 50))}
          required
          autoFocus
          fullWidth
          disabled={saving}
          error={error?.campo === "nombre"}
          helperText={error?.campo === "nombre" ? error.message : undefined}
          sx={{ mb: 2.5 }}
        />
        <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Permisos ({seleccion.size} de {permisos.length})</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Solo puedes otorgar los permisos que tú tienes. Los cambios aplican a los usuarios del rol en su siguiente acción.
        </Typography>
        <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
          {grupos.map(({ area, items }) => (
            <Box key={area} component="fieldset" sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}>
              <FormLabel component="legend" sx={{ fontWeight: 700, color: "text.primary", mb: 0.5 }}>{area}</FormLabel>
              <FormGroup>
                {items.map((permiso) => {
                  const ajeno = !propios.has(permiso.codigo)
                  return (
                    <FormControlLabel
                      key={permiso.codigo}
                      disabled={saving || ajeno}
                      control={<Checkbox checked={seleccion.has(permiso.codigo)} onChange={() => toggle(permiso.codigo)} />}
                      sx={{ alignItems: "flex-start", my: 0.25, "& .MuiCheckbox-root": { pt: 0.5 } }}
                      label={
                        <Box sx={{ pt: 0.75 }}>
                          <Typography sx={{ fontSize: "0.875rem", fontWeight: 600, lineHeight: 1.3 }}>{permiso.descripcion}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                            {permiso.codigo}{ajeno ? " · no lo tienes" : ""}
                          </Typography>
                        </Box>
                      }
                    />
                  )
                })}
              </FormGroup>
            </Box>
          ))}
        </Box>
        {error && error.campo === null && <FeedbackAlert severity="error" sx={{ mt: 2 }}>{error.message}</FeedbackAlert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button variant="contained" onClick={() => void submit()} disabled={saving}>
          {saving ? "Guardando…" : rol ? "Guardar cambios" : "Crear rol"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
