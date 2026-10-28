import { useEffect, useMemo, useRef, useState } from "react"
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined"
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Card from "@mui/material/Card"
import Chip from "@mui/material/Chip"
import CircularProgress from "@mui/material/CircularProgress"
import LinearProgress from "@mui/material/LinearProgress"
import Table from "@mui/material/Table"
import TableBody from "@mui/material/TableBody"
import TableCell from "@mui/material/TableCell"
import TableContainer from "@mui/material/TableContainer"
import TableHead from "@mui/material/TableHead"
import TablePagination from "@mui/material/TablePagination"
import TableRow from "@mui/material/TableRow"
import Typography from "@mui/material/Typography"
import EmptyState from "../../../components/molecules/EmptyState"
import TableToolbar from "../../../components/molecules/TableToolbar"
import type { FilterField } from "../../../components/molecules/filterTypes"
import FeedbackAlert from "../../../components/organisms/FeedbackAlert"
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
import AuditoriaDetalleDialog from "../components/AuditoriaDetalleDialog"
import { ACCIONES, formatFechaHora, tablaLabel } from "../components/auditoria.labels"
import { getAuditoria, getAuditoriaOpciones } from "../services/auditoriaService"
import type { AuditoriaOpciones, AuditoriaPage as Resultado, RegistroAuditoria } from "../types/auditoria.types"

const FILTER_KEYS = ["tabla", "accion", "usuarioId", "desde", "hasta"] as const
const SEARCH_DELAY_MS = 350

export default function AuditoriaPage() {
  const tableState = useTableFilters(FILTER_KEYS, 25)
  const { values, page, rowsPerPage, search } = tableState
  const [registro, setRegistro] = useState("")
  const [opciones, setOpciones] = useState<AuditoriaOpciones>({ tablas: [], usuarios: [] })
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [detalle, setDetalle] = useState<RegistroAuditoria | null>(null)
  const requestId = useRef(0)

  useEffect(() => {
    getAuditoriaOpciones().then(setOpciones).catch(() => undefined)
  }, [])

  // La búsqueda por id de registro espera a que el usuario deje de escribir.
  useEffect(() => {
    const timer = setTimeout(() => setRegistro(search.trim()), SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    const id = ++requestId.current
    setLoading(true)
    setError("")
    getAuditoria({ ...values, registro, page: page + 1, limit: rowsPerPage })
      .then((data) => {
        if (id === requestId.current) setResultado(data)
      })
      .catch((e: unknown) => {
        if (id === requestId.current) setError(e instanceof Error ? e.message : "No se pudo cargar la auditoría.")
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false)
      })
  }, [values, registro, page, rowsPerPage])

  const filterFields = useMemo<FilterField[]>(
    () => [
      {
        key: "tabla",
        type: "select",
        label: "Entidad",
        allLabel: "Todas las entidades",
        options: opciones.tablas.map((tabla) => ({ value: tabla, label: tablaLabel(tabla) })),
      },
      {
        key: "accion",
        type: "select",
        label: "Acción",
        allLabel: "Todas las acciones",
        options: Object.entries(ACCIONES).map(([value, { label }]) => ({ value, label })),
      },
      {
        key: "usuarioId",
        type: "select",
        label: "Usuario",
        allLabel: "Todos los usuarios",
        options: opciones.usuarios.map((usuario) => ({ value: String(usuario.id), label: usuario.nombre })),
      },
      { key: "desde", type: "date", label: "Desde" },
      { key: "hasta", type: "date", label: "Hasta" },
    ],
    [opciones],
  )

  if (loading && !resultado && !error)
    return (
      <Box sx={{ minHeight: 360, display: "grid", placeItems: "center" }}>
        <CircularProgress />
      </Box>
    )

  const items = resultado?.items ?? []
  const total = resultado?.total ?? 0
  const filtrando = tableState.activeCount > 0 || registro !== ""

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 1.5, sm: 3 } }}>
      <Box sx={{ display: { xs: "none", sm: "block" } }}>
        <Typography variant="h4" sx={{ fontSize: "2rem", mb: 0.5 }}>
          Auditoría
        </Typography>
        <Typography color="text.secondary">
          Quién creó, modificó o eliminó cada registro, cuándo y con qué valores.
        </Typography>
      </Box>

      {error && <FeedbackAlert severity="error">{error}</FeedbackAlert>}

      <Card elevation={0} sx={tableCardSx}>
        <TableToolbar
          title="Registro de operaciones"
          description={`${pluralize(total, "operación registrada", "operaciones registradas")}.`}
          search={{
            value: search,
            onChange: tableState.setSearch,
            placeholder: "Buscar por id de registro...",
          }}
          filters={{
            fields: filterFields,
            values,
            activeCount: tableState.activeCount,
            onChange: (key, value) => tableState.setValue(key as (typeof FILTER_KEYS)[number], value),
            onReset: tableState.reset,
          }}
        />
        {loading && <LinearProgress sx={{ height: 2 }} />}

        {items.length === 0 ? (
          <EmptyState
            icon={<FactCheckOutlinedIcon />}
            title={filtrando ? "Ninguna operación coincide" : "Aún no hay operaciones registradas"}
            description={
              filtrando
                ? "Cambia los filtros o el id de registro buscado."
                : "Las creaciones, modificaciones y eliminaciones aparecerán aquí."
            }
          />
        ) : (
          <>
            <Box sx={{ display: { xs: "grid", sm: "none" }, gap: 1, p: 1.5 }}>
              {items.map((item) => {
                const accion = ACCIONES[item.accion]
                return (
                  <Box key={item.id} sx={tableMobileCardSx}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, mb: 0.8 }}>
                      <Box>
                        <Typography sx={tableMobilePrimaryTextSx}>
                          {tablaLabel(item.tabla)} #{item.registro}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatFechaHora(item.fechaHora)}
                        </Typography>
                      </Box>
                      <Chip size="small" color={accion.color} label={accion.label} />
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography sx={{ fontSize: "0.875rem" }}>{item.usuario.nombre}</Typography>
                      <Button
                        size="small"
                        startIcon={<VisibilityRoundedIcon sx={{ fontSize: 16 }} />}
                        onClick={() => setDetalle(item)}
                      >
                        Detalle
                      </Button>
                    </Box>
                  </Box>
                )
              })}
            </Box>

            <TableContainer sx={{ display: { xs: "none", sm: "block" } }}>
              <Table sx={tableSx} aria-label="Tabla de auditoría">
                <TableHead>
                  <TableRow>
                    <TableCell>FECHA</TableCell>
                    <TableCell>USUARIO</TableCell>
                    <TableCell>ENTIDAD</TableCell>
                    <TableCell>REGISTRO</TableCell>
                    <TableCell>ACCIÓN</TableCell>
                    <TableCell align="center">DETALLE</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item) => {
                    const accion = ACCIONES[item.accion]
                    return (
                      <TableRow key={item.id} hover>
                        <TableCell>{formatFechaHora(item.fechaHora)}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{item.usuario.nombre}</TableCell>
                        <TableCell>{tablaLabel(item.tabla)}</TableCell>
                        <TableCell>#{item.registro}</TableCell>
                        <TableCell>
                          <Chip size="small" color={accion.color} label={accion.label} />
                        </TableCell>
                        <TableCell align="center">
                          <Button size="small" startIcon={<VisibilityRoundedIcon />} onClick={() => setDetalle(item)}>
                            Ver cambios
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              rowsPerPageOptions={[25, 50, 100]}
              count={total}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(_, value) => tableState.setPage(value)}
              onRowsPerPageChange={(e) => tableState.setRowsPerPage(Number(e.target.value))}
              {...tablePaginationLabels}
              sx={tablePaginationSx}
            />
          </>
        )}
      </Card>

      <AuditoriaDetalleDialog registro={detalle} onClose={() => setDetalle(null)} />
    </Box>
  )
}
