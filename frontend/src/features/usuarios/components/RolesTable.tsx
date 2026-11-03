import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Card from "@mui/material/Card"
import Chip from "@mui/material/Chip"
import Table from "@mui/material/Table"
import TableBody from "@mui/material/TableBody"
import TableCell from "@mui/material/TableCell"
import TableContainer from "@mui/material/TableContainer"
import TableHead from "@mui/material/TableHead"
import TableRow from "@mui/material/TableRow"
import Typography from "@mui/material/Typography"
import AddModeratorRoundedIcon from "@mui/icons-material/AddModeratorRounded"
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined"
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded"
import EditOutlinedIcon from "@mui/icons-material/EditOutlined"
import LockRoundedIcon from "@mui/icons-material/LockRounded"
import EmptyState from "../../../components/molecules/EmptyState"
import TableToolbar from "../../../components/molecules/TableToolbar"
import { tableCardSx, tableMobileCardSx, tableMobilePrimaryTextSx, tableSx } from "../../../components/tableStyles"
import { pluralize } from "../../../utils/plural"
import type { Rol } from "../types/usuarios.types"
import RowAction from "./RowAction"

type Props = {
  roles: Rol[]
  totalPermisos: number
  onCreate: () => void
  onEdit: (rol: Rol) => void
  onDelete: (rol: Rol) => void
}

function bloqueoEdicion(rol: Rol): string | undefined {
  if (rol.protegido) return "Rol protegido: siempre tiene todos los permisos"
  if (!rol.gestionable) return "Tiene permisos que tú no tienes"
  return undefined
}

function bloqueoBorrado(rol: Rol): string | undefined {
  return bloqueoEdicion(rol) ?? (rol.usuarios > 0 ? "Tiene usuarios asignados; reasígnalos primero" : undefined)
}

export default function RolesTable({ roles, totalPermisos, onCreate, onEdit, onDelete }: Props) {
  const nombre = (rol: Rol) => (
    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
      {rol.nombre}
      {rol.protegido && (
        <Chip size="small" icon={<LockRoundedIcon />} label="Protegido" variant="outlined" sx={{ height: 22, fontSize: "0.7rem" }} />
      )}
    </Box>
  )

  const acciones = (rol: Rol) => (
    <>
      <RowAction label={`Editar el rol ${rol.nombre}`} icon={<EditOutlinedIcon fontSize="small" />} onClick={() => onEdit(rol)} disabledReason={bloqueoEdicion(rol)} />
      <RowAction label={`Borrar el rol ${rol.nombre}`} icon={<DeleteOutlineRoundedIcon fontSize="small" />} onClick={() => onDelete(rol)} disabledReason={bloqueoBorrado(rol)} color="error" />
    </>
  )

  return (
    <Card elevation={0} sx={tableCardSx}>
      <TableToolbar
        title="Roles"
        description="Un rol agrupa permisos; cada usuario tiene un rol. Solo puedes crear o editar roles con permisos que tú tienes."
        actions={
          <Button variant="contained" startIcon={<AddModeratorRoundedIcon />} onClick={onCreate} sx={{ whiteSpace: "nowrap" }}>
            Nuevo rol
          </Button>
        }
      />
      {roles.length === 0 ? (
        <EmptyState icon={<AdminPanelSettingsOutlinedIcon />} title="No hay roles registrados" description="Crea un rol con el botón Nuevo rol." />
      ) : (
        <>
          <Box sx={{ display: { xs: "grid", sm: "none" }, gap: 1, p: 1.5 }}>
            {roles.map((rol) => (
              <Box key={rol.id} sx={tableMobileCardSx}>
                <Typography sx={tableMobilePrimaryTextSx}>{nombre(rol)}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {pluralize(rol.usuarios, "usuario")} · {rol.permisos.length} de {totalPermisos} permisos
                </Typography>
                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>{acciones(rol)}</Box>
              </Box>
            ))}
          </Box>
          <TableContainer sx={{ display: { xs: "none", sm: "block" } }}>
            <Table sx={tableSx} aria-label="Tabla de roles">
              <TableHead>
                <TableRow>
                  <TableCell>ROL</TableCell>
                  <TableCell align="center">USUARIOS</TableCell>
                  <TableCell align="center">PERMISOS</TableCell>
                  <TableCell align="right">ACCIONES</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {roles.map((rol) => (
                  <TableRow key={rol.id} hover>
                    <TableCell sx={{ fontWeight: 700 }}>{nombre(rol)}</TableCell>
                    <TableCell align="center">{rol.usuarios.toLocaleString("es-CO")}</TableCell>
                    <TableCell align="center">{rol.permisos.length} de {totalPermisos}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>{acciones(rol)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Card>
  )
}
