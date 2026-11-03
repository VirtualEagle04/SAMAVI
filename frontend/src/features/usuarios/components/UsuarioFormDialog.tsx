import { useState } from "react"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogTitle from "@mui/material/DialogTitle"
import MenuItem from "@mui/material/MenuItem"
import TextField from "@mui/material/TextField"
import FeedbackAlert from "../../../components/organisms/FeedbackAlert"
import type { CrearUsuarioPayload, EditarUsuarioPayload, Rol, Usuario } from "../types/usuarios.types"
import PasswordField from "./PasswordField"
import { leerContacto } from "./usuarios.labels"

type Props = {
  /** null: crear. */
  usuario: Usuario | null
  roles: Rol[]
  onClose: () => void
  onCreate: (data: CrearUsuarioPayload) => Promise<void>
  onUpdate: (id: number, data: EditarUsuarioPayload) => Promise<void>
}

type Campo = "nombre" | "login" | "password" | "idRol" | "telefono" | "correo"

/** Ubica el mensaje del backend en el campo al que se refiere. */
function campoDelError(message: string): Campo | null {
  const texto = message.toLowerCase()
  if (texto.includes("contraseña")) return "password"
  if (texto.includes("login")) return "login"
  if (texto.includes("nombre")) return "nombre"
  if (texto.includes("telefono") || texto.includes("teléfono")) return "telefono"
  if (texto.includes("correo")) return "correo"
  if (texto.includes("rol")) return "idRol"
  return null
}

export default function UsuarioFormDialog({ usuario, roles, onClose, onCreate, onUpdate }: Props) {
  const editando = usuario !== null
  const contactoInicial = leerContacto(usuario?.contacto ?? null)
  const [nombre, setNombre] = useState(usuario?.nombre ?? "")
  const [login, setLogin] = useState(usuario?.login ?? "")
  const [password, setPassword] = useState("")
  const [idRol, setIdRol] = useState(usuario ? String(usuario.rol.id) : "")
  const [telefono, setTelefono] = useState(contactoInicial.telefono ?? "")
  const [correo, setCorreo] = useState(contactoInicial.correo ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<{ campo: Campo | null; message: string } | null>(null)

  // Sobre sí mismo no se cambia el rol, y a otro solo se le asignan roles cubiertos por el gestor.
  const rolFijo = usuario?.esPropio ?? false
  const opcionesRol = roles.filter((rol) => rol.asignable || rol.id === usuario?.rol.id)

  const errorDe = (campo: Campo) => (error?.campo === campo ? error.message : undefined)

  const submit = async () => {
    if (!nombre.trim()) { setError({ campo: "nombre", message: "Escribe el nombre." }); return }
    if (!login.trim()) { setError({ campo: "login", message: "Escribe el login." }); return }
    if (!editando && !password) { setError({ campo: "password", message: "Escribe una contraseña." }); return }
    if (!idRol) { setError({ campo: "idRol", message: "Elige un rol." }); return }

    const contacto = telefono.trim() || correo.trim()
      ? { ...(telefono.trim() ? { telefono: telefono.trim() } : {}), ...(correo.trim() ? { correo: correo.trim() } : {}) }
      : null
    setSaving(true)
    setError(null)
    try {
      if (usuario) {
        await onUpdate(usuario.id, {
          nombre: nombre.trim(),
          login: login.trim(),
          contacto,
          ...(rolFijo ? {} : { idRol: Number(idRol) }),
        })
      } else {
        await onCreate({ nombre: nombre.trim(), login: login.trim(), password, contacto, idRol: Number(idRol) })
      }
      onClose()
    } catch (e) {
      const message = e instanceof Error ? e.message : "No se pudo guardar el usuario."
      setError({ campo: campoDelError(message), message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onClose={() => { if (!saving) onClose() }} fullWidth maxWidth="sm" aria-labelledby="usuario-form-title">
      <DialogTitle id="usuario-form-title" sx={{ fontWeight: 700 }}>
        {editando ? `Editar a ${usuario.nombre}` : "Nuevo usuario"}
      </DialogTitle>
      <DialogContent>
        <Box
          component="form"
          noValidate
          onSubmit={(event) => { event.preventDefault(); void submit() }}
          sx={{ display: "grid", gap: 2, pt: 1 }}
        >
          <TextField
            label="Nombre completo"
            value={nombre}
            onChange={(e) => setNombre(e.target.value.slice(0, 100))}
            required
            autoFocus
            disabled={saving}
            error={Boolean(errorDe("nombre"))}
            helperText={errorDe("nombre")}
            slotProps={{ htmlInput: { autoComplete: "off" } }}
          />
          <TextField
            label="Login"
            value={login}
            onChange={(e) => setLogin(e.target.value.toLowerCase().slice(0, 50))}
            required
            disabled={saving}
            error={Boolean(errorDe("login"))}
            helperText={errorDe("login") ?? "De 3 a 50 caracteres: letras sin tilde, números, punto, guion o guion bajo."}
            slotProps={{ htmlInput: { autoComplete: "off", autoCapitalize: "none", spellCheck: false } }}
          />
          {!editando && (
            <PasswordField
              label="Contraseña"
              value={password}
              onChange={setPassword}
              disabled={saving}
              error={errorDe("password")}
            />
          )}
          <TextField
            select
            label="Rol"
            value={idRol}
            onChange={(e) => setIdRol(e.target.value)}
            required
            disabled={saving || rolFijo}
            error={Boolean(errorDe("idRol"))}
            helperText={errorDe("idRol") ?? (rolFijo ? "No puedes cambiar tu propio rol." : "Solo aparecen los roles que puedes asignar.")}
          >
            {opcionesRol.map((rol) => (
              <MenuItem key={rol.id} value={String(rol.id)}>{rol.nombre}</MenuItem>
            ))}
          </TextField>
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
            <TextField
              label="Teléfono (opcional)"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value.slice(0, 20))}
              disabled={saving}
              error={Boolean(errorDe("telefono"))}
              helperText={errorDe("telefono")}
              slotProps={{ htmlInput: { inputMode: "tel", autoComplete: "off" } }}
            />
            <TextField
              label="Correo (opcional)"
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value.slice(0, 254))}
              disabled={saving}
              error={Boolean(errorDe("correo"))}
              helperText={errorDe("correo")}
              slotProps={{ htmlInput: { autoComplete: "off" } }}
            />
          </Box>
          {error && error.campo === null && <FeedbackAlert severity="error">{error.message}</FeedbackAlert>}
          {/* Permite enviar con Enter. */}
          <button type="submit" hidden />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button variant="contained" onClick={() => void submit()} disabled={saving}>
          {saving ? "Guardando…" : editando ? "Guardar cambios" : "Crear usuario"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
