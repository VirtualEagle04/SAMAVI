import { useState } from "react"
import type { ChangeEvent } from "react"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Card from "@mui/material/Card"
import Chip from "@mui/material/Chip"
import FormControl from "@mui/material/FormControl"
import MenuItem from "@mui/material/MenuItem"
import Select from "@mui/material/Select"
import Table from "@mui/material/Table"
import TableBody from "@mui/material/TableBody"
import TableCell from "@mui/material/TableCell"
import TableContainer from "@mui/material/TableContainer"
import TableHead from "@mui/material/TableHead"
import TablePagination from "@mui/material/TablePagination"
import TableRow from "@mui/material/TableRow"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded"
import AddCircleOutlineRoundedIcon from "@mui/icons-material/AddCircleOutlineRounded"
import type { CategoriaPeso, CierreDiario, Galpon } from "../types/produccion.types"

interface ClosuresTableProps {
  cierres: CierreDiario[]
  galpones: Galpon[]
  categorias: CategoriaPeso[]
  onOpenDailyCloseModal: () => void
  canPerformClose: boolean
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Y: { bg: "#fef3c7", text: "#92400e", border: "#fde68a" },
  Ex: { bg: "#fce7f3", text: "#9d174d", border: "#fbcfe8" },
  AA: { bg: "#e0f2fe", text: "#075985", border: "#bae6fd" },
  A: { bg: "#dcfce7", text: "#166534", border: "#bbf7d0" },
  B: { bg: "#ffedd5", text: "#9a3412", border: "#fed7aa" },
  C: { bg: "#f3e8ff", text: "#6b21a8", border: "#e9d5ff" },
  P: { bg: "#f1f5f9", text: "#334155", border: "#cbd5e1" },
}

export default function ClosuresTable({
  cierres,
  galpones,
  categorias,
  onOpenDailyCloseModal,
  canPerformClose,
}: ClosuresTableProps) {
  const [selectedGalpon, setSelectedGalpon] = useState<number | "all">("all")
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  const filteredCierres = cierres.filter((c) => {
    const cierreDateStr = c.fecha.slice(0, 10)
    const matchesDate = selectedDate === "" || cierreDateStr === selectedDate
    const matchesGalpon = selectedGalpon === "all" || c.idGalpon === selectedGalpon
    return matchesDate && matchesGalpon
  })

  const paginatedCierres = filteredCierres.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  )

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event: ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 1.5,
        border: "1px solid",
        borderColor: "divider",
        backgroundColor: "background.paper",
        overflow: "hidden",
      }}
    >
      {/* Header Toolbar */}
      <Box
        sx={{
          p: 2,
          borderBottom: "1px solid",
          borderColor: "divider",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1.5,
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, color: "text.primary", fontSize: "1.1rem" }}>
            Cierres Diarios y Consolidado de Empaque
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.825rem" }}>
            Liquidación de producción consolidada en bandejas de 30 unidades y sobrantes
          </Typography>
        </Box>

        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.2 }}>
          {/* Date filter */}
          <TextField
            type="date"
            size="small"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value)
              setPage(0)
            }}
            sx={{
              minWidth: 150,
              "& .MuiInputBase-root": {
                minHeight: 38,
                borderRadius: 1,
                bgcolor: "#ffffff",
                fontSize: "0.85rem",
              },
            }}
          />

          {/* Galpon Filter */}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <Select
              value={selectedGalpon}
              onChange={(e) => {
                setSelectedGalpon(e.target.value === "all" ? "all" : Number(e.target.value))
                setPage(0)
              }}
              sx={{
                borderRadius: 1,
                minHeight: 38,
                fontSize: "0.85rem",
                fontWeight: 600,
                bgcolor: "#ffffff",
              }}
            >
              <MenuItem value="all">Todos los galpones</MenuItem>
              {galpones.map((g) => (
                <MenuItem key={g.id} value={g.id}>
                  {g.nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {canPerformClose && (
            <Button
              variant="contained"
              size="small"
              startIcon={<AddCircleOutlineRoundedIcon />}
              onClick={onOpenDailyCloseModal}
              sx={{
                borderRadius: 1,
                backgroundColor: "primary.main",
                color: "#ffffff",
                fontSize: "0.85rem",
                fontWeight: 700,
                px: 1.8,
                minHeight: 38,
                boxShadow: "none",
                "&:hover": { backgroundColor: "primary.dark" },
              }}
            >
              Efectuar Cierre
            </Button>
          )}
        </Box>
      </Box>

      {/* Table */}
      <TableContainer>
        <Table sx={{ minWidth: 700 }} aria-label="tabla de cierres diarios">
          <TableHead sx={{ bgcolor: "#faf7f2" }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800, fontSize: "0.8rem", color: "text.secondary", py: 1.2 }}>
                FECHA
              </TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: "0.8rem", color: "text.secondary", py: 1.2 }}>
                GALPÓN
              </TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: "0.8rem", color: "text.secondary", py: 1.2 }}>
                CATEGORÍA
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, fontSize: "0.8rem", color: "text.secondary", py: 1.2 }}>
                BANDEJAS (30 UDS)
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, fontSize: "0.8rem", color: "text.secondary", py: 1.2 }}>
                SOBRANTE
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, fontSize: "0.8rem", color: "text.secondary", py: 1.2 }}>
                TOTAL UNIDADES
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, fontSize: "0.8rem", color: "text.secondary", py: 1.2 }}>
                ESTADO
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {paginatedCierres.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6, color: "text.secondary" }}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    No hay registros de cierres diarios disponibles
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.disabled", mt: 0.5 }}>
                    Realiza un cierre diario para consolidar los conteos en bandejas y stock.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedCierres.map((row, idx) => {
                const dateObj = new Date(row.fecha)
                const dateStr = dateObj.toLocaleDateString("es-CO", {
                  timeZone: "UTC",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })

                const galponObj = row.galpon ?? galpones.find((g) => g.id === row.idGalpon)
                const catObj = row.categoriaPeso ?? categorias.find((c) => c.codigo === row.codigoCategoriaPeso)
                const totalUnits = row.cantidadBandejas * 30 + row.cantidadSobrante
                const catColor = CATEGORY_COLORS[row.codigoCategoriaPeso] || {
                  bg: "#f1f5f9",
                  text: "#334155",
                  border: "#cbd5e1",
                }

                return (
                  <TableRow
                    key={`${row.idGalpon}-${row.codigoCategoriaPeso}-${row.fecha}-${idx}`}
                    hover
                    sx={{
                      "&:last-child td, &:last-child th": { border: 0 },
                      transition: "background-color 0.1s",
                    }}
                  >
                    <TableCell sx={{ fontWeight: 700, color: "text.primary" }}>
                      {dateStr}
                    </TableCell>

                    <TableCell sx={{ fontWeight: 700, color: "text.primary" }}>
                      {galponObj?.nombre ?? `Galpón ${row.idGalpon}`}
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={`${catObj?.nombre ?? row.codigoCategoriaPeso} (${row.codigoCategoriaPeso})`}
                        size="small"
                        sx={{
                          fontWeight: 800,
                          fontSize: "0.75rem",
                          borderRadius: 0.8,
                          bgcolor: catColor.bg,
                          color: catColor.text,
                          border: `1px solid ${catColor.border}`,
                        }}
                      />
                    </TableCell>

                    <TableCell align="center">
                      <Typography variant="body2" sx={{ fontWeight: 800, color: "primary.dark" }}>
                        {row.cantidadBandejas.toLocaleString()}
                      </Typography>
                    </TableCell>

                    <TableCell align="center">
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary" }}>
                        {row.cantidadSobrante} uds
                      </Typography>
                    </TableCell>

                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 800, color: "text.primary" }}>
                        {totalUnits.toLocaleString()} uds
                      </Typography>
                    </TableCell>

                    <TableCell align="center">
                      <Chip
                        icon={<CheckCircleRoundedIcon sx={{ fontSize: 14 }} />}
                        label="Consolidado"
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: "0.75rem",
                          borderRadius: 0.8,
                          bgcolor: "#f0fdf4",
                          color: "#166534",
                          border: "1px solid #86efac",
                        }}
                      />
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        rowsPerPageOptions={[10, 25, 50]}
        component="div"
        count={filteredCierres.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="Filas por página:"
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        sx={{ borderTop: "1px solid", borderColor: "divider" }}
      />
    </Card>
  )
}
