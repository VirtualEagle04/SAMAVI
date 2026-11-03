import { useMemo } from "react"
import Box from "@mui/material/Box"
import Card from "@mui/material/Card"
import Chip from "@mui/material/Chip"
import Table from "@mui/material/Table"
import TableBody from "@mui/material/TableBody"
import TableCell from "@mui/material/TableCell"
import TableContainer from "@mui/material/TableContainer"
import TableHead from "@mui/material/TableHead"
import TableRow from "@mui/material/TableRow"
import Typography from "@mui/material/Typography"
import EditOutlinedIcon from "@mui/icons-material/EditOutlined"
import KeyOffRoundedIcon from "@mui/icons-material/KeyOffRounded"
import EmptyState from "../../../components/molecules/EmptyState"
import TableToolbar from "../../../components/molecules/TableToolbar"
import { tableCardSx, tableMobileCardSx, tableMobilePrimaryTextSx, tableSx } from "../../../components/tableStyles"
import { useTableFilters } from "../../../hooks/useTableFilters"
import type { Permiso } from "../types/usuarios.types"
import RowAction from "./RowAction"
import { agruparPorArea } from "./usuarios.labels"

const NO_FILTER_KEYS = [] as const

type Props = {
  permisos: Permiso[]
  onEdit: (permiso: Permiso) => void
}

function Roles({ permiso }: { permiso: Permiso }) {
  if (permiso.roles.length === 0) return <Typography variant="body2" color="text.secondary">Ningún rol</Typography>
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
      {permiso.roles.map((rol) => <Chip key={rol.id} size="small" variant="outlined" label={rol.nombre} />)}
    </Box>
  )
}

export default function PermisosTable({ permisos, onEdit }: Props) {
  const tableState = useTableFilters(NO_FILTER_KEYS)
  const { search } = tableState

  const grupos = useMemo(() => {
    const texto = search.toLowerCase().trim()
    const filtrados = permisos.filter((permiso) =>
      !texto || permiso.codigo.toLowerCase().includes(texto) || permiso.descripcion.toLowerCase().includes(texto),
    )
    return agruparPorArea(filtrados)
  }, [permisos, search])

  const editar = (permiso: Permiso) => (
    <RowAction label={`Editar la descripción de ${permiso.codigo}`} icon={<EditOutlinedIcon fontSize="small" />} onClick={() => onEdit(permiso)} />
  )

  return (
    <Card elevation={0} sx={tableCardSx}>
      <TableToolbar
        title="Catálogo de permisos"
        description="Los permisos los define el sistema: cada uno habilita una función. Se asignan desde la pestaña Roles; aquí solo se edita su descripción."
        search={{ value: search, onChange: tableState.setSearch, placeholder: "Buscar por código o descripción..." }}
      />
      {grupos.length === 0 ? (
        <EmptyState
          icon={<KeyOffRoundedIcon />}
          title={permisos.length === 0 ? "No hay permisos registrados" : "No se encontraron permisos"}
          description={permisos.length === 0 ? "El catálogo se carga con el esquema de la base de datos." : "Revisa el término de búsqueda."}
        />
      ) : (
        <>
          <Box sx={{ display: { xs: "grid", sm: "none" }, gap: 1, p: 1.5 }}>
            {grupos.flatMap(({ area, items }) => [
              <Typography key={`area-${area}`} variant="overline" color="text.secondary" sx={{ mt: 1 }}>{area}</Typography>,
              ...items.map((permiso) => (
                <Box key={permiso.id} sx={tableMobileCardSx}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                    <Box>
                      <Typography sx={tableMobilePrimaryTextSx}>{permiso.descripcion}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>{permiso.codigo}</Typography>
                    </Box>
                    {editar(permiso)}
                  </Box>
                  <Box sx={{ mt: 1 }}><Roles permiso={permiso} /></Box>
                </Box>
              )),
            ])}
          </Box>
          <TableContainer sx={{ display: { xs: "none", sm: "block" } }}>
            <Table sx={tableSx} aria-label="Catálogo de permisos">
              <TableHead>
                <TableRow>
                  <TableCell>CÓDIGO</TableCell>
                  <TableCell>DESCRIPCIÓN</TableCell>
                  <TableCell>ROLES</TableCell>
                  <TableCell align="right">ACCIONES</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {grupos.flatMap(({ area, items }) => [
                  <TableRow key={`area-${area}`}>
                    <TableCell colSpan={4} sx={{ bgcolor: "action.hover", fontWeight: 700 }}>{area}</TableCell>
                  </TableRow>,
                  ...items.map((permiso) => (
                    <TableRow key={permiso.id} hover>
                      <TableCell sx={{ fontFamily: "monospace", fontWeight: 600 }}>{permiso.codigo}</TableCell>
                      <TableCell>{permiso.descripcion}</TableCell>
                      <TableCell><Roles permiso={permiso} /></TableCell>
                      <TableCell align="right">{editar(permiso)}</TableCell>
                    </TableRow>
                  )),
                ])}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Card>
  )
}
