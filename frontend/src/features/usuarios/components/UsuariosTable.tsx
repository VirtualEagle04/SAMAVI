import { useMemo } from "react"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Card from "@mui/material/Card"
import Chip from "@mui/material/Chip"
import Table from "@mui/material/Table"
import TableBody from "@mui/material/TableBody"
import TableCell from "@mui/material/TableCell"
import TableContainer from "@mui/material/TableContainer"
import TableHead from "@mui/material/TableHead"
import TablePagination from "@mui/material/TablePagination"
import TableRow from "@mui/material/TableRow"
import Typography from "@mui/material/Typography"
import BlockRoundedIcon from "@mui/icons-material/BlockRounded"
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded"
import EditOutlinedIcon from "@mui/icons-material/EditOutlined"
import KeyRoundedIcon from "@mui/icons-material/KeyRounded"
import PersonAddAlt1RoundedIcon from "@mui/icons-material/PersonAddAlt1Rounded"
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined"
import EmptyState from "../../../components/molecules/EmptyState"
import TableToolbar from "../../../components/molecules/TableToolbar"
import type { FilterField } from "../../../components/molecules/filterTypes"
import {
  tableCardSx,
  tableMobileCardSx,
  tableMobilePrimaryTextSx,
  tablePaginationLabels,
  tablePaginationSx,
  tableSx,
} from "../../../components/tableStyles"
import { useTableFilters } from "../../../hooks/useTableFilters"
import { pluralize } from "../../../utils/plural"
import type { Rol, Usuario } from "../types/usuarios.types"
import RowAction from "./RowAction"
import { contactoTexto } from "./usuarios.labels"

const FILTER_KEYS = ["rol", "estado"] as const
const SIN_PERMISO = "Tiene permisos que tú no tienes"

type Props = {
  usuarios: Usuario[]
  roles: Rol[]
  onCreate: () => void
  onEdit: (usuario: Usuario) => void
  onPassword: (usuario: Usuario) => void
  onToggleEstado: (usuario: Usuario) => void
}

function EstadoChip({ activo }: { activo: boolean }) {
  return (
    <Chip
      size="small"
      variant="outlined"
      color={activo ? "success" : "default"}
      icon={activo ? <CheckCircleOutlineRoundedIcon /> : <BlockRoundedIcon />}
      label={activo ? "Activo" : "Inactivo"}
    />
  )
}

export default function UsuariosTable({ usuarios, roles, onCreate, onEdit, onPassword, onToggleEstado }: Props) {
  const tableState = useTableFilters(FILTER_KEYS)
  const { search, values } = tableState

  const fields: FilterField[] = useMemo(() => [
    {
      key: "rol",
      label: "Rol",
      type: "select",
      allLabel: "Todos los roles",
      options: roles.map((rol) => ({ value: String(rol.id), label: rol.nombre })),
    },
    {
      key: "estado",
      label: "Estado",
      type: "select",
      allLabel: "Todos",
      options: [{ value: "activo", label: "Activos" }, { value: "inactivo", label: "Inactivos" }],
    },
  ], [roles])

  const filtrados = useMemo(() => {
    const texto = search.toLowerCase().trim()
    return usuarios.filter((usuario) =>
      (!texto || usuario.nombre.toLowerCase().includes(texto) || usuario.login.includes(texto)) &&
      (!values.rol || String(usuario.rol.id) === values.rol) &&
      (!values.estado || (values.estado === "activo") === usuario.activo),
    )
  }, [usuarios, search, values])

  const { rows, page } = tableState.paginate(filtrados)
  const activos = usuarios.filter((usuario) => usuario.activo).length

  const acciones = (usuario: Usuario) => {
    const bloqueo = usuario.gestionable ? undefined : SIN_PERMISO
    return (
      <>
        <RowAction label={`Editar a ${usuario.nombre}`} icon={<EditOutlinedIcon fontSize="small" />} onClick={() => onEdit(usuario)} disabledReason={bloqueo} />
        <RowAction label={`Restablecer la contraseña de ${usuario.nombre}`} icon={<KeyRoundedIcon fontSize="small" />} onClick={() => onPassword(usuario)} disabledReason={bloqueo} />
        <RowAction
          label={usuario.activo ? `Desactivar a ${usuario.nombre}` : `Activar a ${usuario.nombre}`}
          icon={usuario.activo ? <BlockRoundedIcon fontSize="small" /> : <CheckCircleOutlineRoundedIcon fontSize="small" />}
          onClick={() => onToggleEstado(usuario)}
          color={usuario.activo ? "error" : "primary"}
          disabledReason={usuario.esPropio ? "No puedes desactivar tu propia cuenta" : bloqueo}
        />
      </>
    )
  }

  const nombreCon = (usuario: Usuario) => (
    <>
      {usuario.nombre}
      {usuario.esPropio && <Chip size="small" label="Tú" sx={{ ml: 1, height: 20, fontSize: "0.7rem" }} />}
    </>
  )

  return (
    <Card elevation={0} sx={tableCardSx}>
      <TableToolbar
        title="Usuarios"
        description={`${pluralize(activos, "usuario activo", "usuarios activos")} de ${usuarios.length.toLocaleString("es-CO")}. Desactivar conserva el historial y cierra sus sesiones.`}
        search={{ value: search, onChange: tableState.setSearch, placeholder: "Buscar por nombre o login..." }}
        filters={{
          fields,
          values,
          activeCount: tableState.activeCount,
          onChange: (key, value) => tableState.setValue(key as (typeof FILTER_KEYS)[number], value),
          onReset: tableState.reset,
        }}
        actions={
          <Button variant="contained" startIcon={<PersonAddAlt1RoundedIcon />} onClick={onCreate} sx={{ whiteSpace: "nowrap" }}>
            Nuevo usuario
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<PeopleAltOutlinedIcon />}
          title={usuarios.length === 0 ? "No hay usuarios registrados" : "No se encontraron usuarios"}
          description={usuarios.length === 0 ? "Crea el primer usuario con el botón Nuevo usuario." : "Revisa la búsqueda o los filtros aplicados."}
        />
      ) : (
        <>
          <Box sx={{ display: { xs: "grid", sm: "none" }, gap: 1, p: 1.5 }}>
            {rows.map((usuario) => (
              <Box key={usuario.id} sx={tableMobileCardSx}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={tableMobilePrimaryTextSx}>{nombreCon(usuario)}</Typography>
                    <Typography variant="caption" color="text.secondary">{usuario.login} · {usuario.rol.nombre}</Typography>
                  </Box>
                  <EstadoChip activo={usuario.activo} />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{contactoTexto(usuario.contacto)}</Typography>
                <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 0.5 }}>{acciones(usuario)}</Box>
              </Box>
            ))}
          </Box>

          <TableContainer sx={{ display: { xs: "none", sm: "block" } }}>
            <Table sx={tableSx} aria-label="Tabla de usuarios">
              <TableHead>
                <TableRow>
                  <TableCell>NOMBRE</TableCell>
                  <TableCell>LOGIN</TableCell>
                  <TableCell>ROL</TableCell>
                  <TableCell>CONTACTO</TableCell>
                  <TableCell>ESTADO</TableCell>
                  <TableCell align="right">ACCIONES</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((usuario) => (
                  <TableRow key={usuario.id} hover>
                    <TableCell sx={{ fontWeight: 700 }}>{nombreCon(usuario)}</TableCell>
                    <TableCell sx={{ fontFamily: "monospace" }}>{usuario.login}</TableCell>
                    <TableCell>{usuario.rol.nombre}</TableCell>
                    <TableCell>{contactoTexto(usuario.contacto)}</TableCell>
                    <TableCell><EstadoChip activo={usuario.activo} /></TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>{acciones(usuario)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            rowsPerPageOptions={[10, 25, 50]}
            count={filtrados.length}
            rowsPerPage={tableState.rowsPerPage}
            page={page}
            onPageChange={(_, value) => tableState.setPage(value)}
            onRowsPerPageChange={(e) => tableState.setRowsPerPage(Number(e.target.value))}
            {...tablePaginationLabels}
            sx={tablePaginationSx}
          />
        </>
      )}
    </Card>
  )
}
