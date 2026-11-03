import { useCallback, useEffect, useState } from "react"
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import CircularProgress from "@mui/material/CircularProgress"
import Snackbar from "@mui/material/Snackbar"
import Typography from "@mui/material/Typography"
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined"
import KeyRoundedIcon from "@mui/icons-material/KeyRounded"
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined"
import ModuleTabs from "../../../components/molecules/ModuleTabs"
import FeedbackAlert from "../../../components/organisms/FeedbackAlert"
import { useAuthStore } from "../../auth/stores/authStore"
import ConfirmDialog from "../components/ConfirmDialog"
import PasswordDialog from "../components/PasswordDialog"
import PermisoDialog from "../components/PermisoDialog"
import PermisosTable from "../components/PermisosTable"
import RolFormDialog from "../components/RolFormDialog"
import RolesTable from "../components/RolesTable"
import UsuarioFormDialog from "../components/UsuarioFormDialog"
import UsuariosTable from "../components/UsuariosTable"
import * as api from "../services/usuariosService"
import type { Permiso, Rol, Usuario } from "../types/usuarios.types"

type Dialogo =
  | { tipo: "usuario"; usuario: Usuario | null }
  | { tipo: "password"; usuario: Usuario }
  | { tipo: "estado"; usuario: Usuario }
  | { tipo: "rol"; rol: Rol | null }
  | { tipo: "borrarRol"; rol: Rol }
  | { tipo: "permiso"; permiso: Permiso }

export default function UsuariosPage() {
  const permisosPropios = useAuthStore((state) => state.permissions)
  const refreshSession = useAuthStore((state) => state.refreshSession)
  const logout = useAuthStore((state) => state.logout)

  const [tab, setTab] = useState(0)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [roles, setRoles] = useState<Rol[]>([])
  const [permisos, setPermisos] = useState<Permiso[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [dialogo, setDialogo] = useState<Dialogo | null>(null)
  const [toast, setToast] = useState("")

  const load = useCallback(async () => {
    setLoadError("")
    try {
      const [nuevosUsuarios, nuevosRoles, nuevosPermisos] = await Promise.all([api.getUsuarios(), api.getRoles(), api.getPermisos()])
      setUsuarios(nuevosUsuarios)
      setRoles(nuevosRoles)
      setPermisos(nuevosPermisos)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "No se pudo cargar la información.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  /** Tras un cambio: recarga y avisa. Los conteos de roles y permisos dependen de todo. */
  const done = async (message: string) => {
    setToast(message)
    await load()
  }

  const cerrar = () => setDialogo(null)

  if (loading) {
    return <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress aria-label="Cargando usuarios" /></Box>
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Box>
        <Typography variant="h4" sx={{ fontSize: { xs: "1.7rem", sm: "2rem" }, mb: 0.5 }}>
          Usuarios y accesos
        </Typography>
        <Typography color="text.secondary">
          Cuentas, roles y los permisos que cada rol tiene en el sistema.
        </Typography>
      </Box>

      {loadError && (
        <FeedbackAlert
          severity="error"
          action={<Button color="inherit" size="small" onClick={() => void load()}>Reintentar</Button>}
        >
          {loadError}
        </FeedbackAlert>
      )}

      <Box>
        <ModuleTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { label: "Usuarios", icon: <PeopleAltOutlinedIcon sx={{ fontSize: 18 }} /> },
            { label: "Roles", icon: <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 18 }} /> },
            { label: "Permisos", icon: <KeyRoundedIcon sx={{ fontSize: 18 }} /> },
          ]}
        />

        {tab === 0 && (
          <UsuariosTable
            usuarios={usuarios}
            roles={roles}
            onCreate={() => setDialogo({ tipo: "usuario", usuario: null })}
            onEdit={(usuario) => setDialogo({ tipo: "usuario", usuario })}
            onPassword={(usuario) => setDialogo({ tipo: "password", usuario })}
            onToggleEstado={(usuario) => setDialogo({ tipo: "estado", usuario })}
          />
        )}
        {tab === 1 && (
          <RolesTable
            roles={roles}
            totalPermisos={permisos.length}
            onCreate={() => setDialogo({ tipo: "rol", rol: null })}
            onEdit={(rol) => setDialogo({ tipo: "rol", rol })}
            onDelete={(rol) => setDialogo({ tipo: "borrarRol", rol })}
          />
        )}
        {tab === 2 && <PermisosTable permisos={permisos} onEdit={(permiso) => setDialogo({ tipo: "permiso", permiso })} />}
      </Box>

      {dialogo?.tipo === "usuario" && (
        <UsuarioFormDialog
          usuario={dialogo.usuario}
          roles={roles}
          onClose={cerrar}
          onCreate={async (data) => {
            await api.crearUsuario(data)
            await done(`Usuario ${data.login} creado`)
          }}
          onUpdate={async (id, data) => {
            await api.editarUsuario(id, data)
            await done("Cambios guardados")
          }}
        />
      )}
      {dialogo?.tipo === "password" && (
        <PasswordDialog
          usuario={dialogo.usuario}
          onClose={cerrar}
          onSave={async (password) => {
            await api.restablecerPassword(dialogo.usuario.id, password)
            if (dialogo.usuario.esPropio) {
              logout("Cambiaste tu contraseña; inicia sesión con la nueva")
              return
            }
            await done(`Contraseña de ${dialogo.usuario.login} cambiada; sus sesiones se cerraron`)
          }}
        />
      )}
      {dialogo?.tipo === "estado" && (
        <ConfirmDialog
          title={dialogo.usuario.activo ? `¿Desactivar a ${dialogo.usuario.nombre}?` : `¿Activar a ${dialogo.usuario.nombre}?`}
          message={dialogo.usuario.activo
            ? "No podrá iniciar sesión y sus sesiones abiertas se cerrarán de inmediato. Su historial se conserva y puedes reactivarlo cuando quieras."
            : "Podrá volver a iniciar sesión con su contraseña actual y los permisos de su rol."}
          confirmLabel={dialogo.usuario.activo ? "Desactivar" : "Activar"}
          danger={dialogo.usuario.activo}
          onClose={cerrar}
          onConfirm={async () => {
            await api.cambiarEstadoUsuario(dialogo.usuario.id, !dialogo.usuario.activo)
            await done(dialogo.usuario.activo ? `${dialogo.usuario.nombre} desactivado` : `${dialogo.usuario.nombre} activado`)
          }}
        />
      )}
      {dialogo?.tipo === "rol" && (
        <RolFormDialog
          rol={dialogo.rol}
          permisos={permisos}
          permisosPropios={permisosPropios}
          onClose={cerrar}
          onSave={async (data) => {
            if (dialogo.rol) {
              await api.editarRol(dialogo.rol.id, data)
              // Si es el rol de la sesión, el menú debe reflejar los permisos nuevos.
              await refreshSession()
              await done(`Rol ${data.nombre} actualizado`)
            } else {
              await api.crearRol(data)
              await done(`Rol ${data.nombre} creado`)
            }
          }}
        />
      )}
      {dialogo?.tipo === "borrarRol" && (
        <ConfirmDialog
          title={`¿Borrar el rol ${dialogo.rol.nombre}?`}
          message="El rol y su asignación de permisos se borran definitivamente. La operación queda en la auditoría."
          confirmLabel="Borrar rol"
          danger
          onClose={cerrar}
          onConfirm={async () => {
            await api.borrarRol(dialogo.rol.id)
            await done(`Rol ${dialogo.rol.nombre} borrado`)
          }}
        />
      )}
      {dialogo?.tipo === "permiso" && (
        <PermisoDialog
          permiso={dialogo.permiso}
          onClose={cerrar}
          onSave={async (descripcion) => {
            await api.editarPermiso(dialogo.permiso.id, descripcion)
            await done("Descripción actualizada")
          }}
        />
      )}

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4500}
        onClose={() => setToast("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity="success" variant="filled" onClose={() => setToast("")}>{toast}</Alert>
      </Snackbar>
    </Box>
  )
}
