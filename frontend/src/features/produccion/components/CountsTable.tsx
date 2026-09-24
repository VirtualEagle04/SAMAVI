import { useState } from "react"
import type { ChangeEvent } from "react"
import Box from "@mui/material/Box"
import Card from "@mui/material/Card"
import Chip from "@mui/material/Chip"
import FormControl from "@mui/material/FormControl"
import InputAdornment from "@mui/material/InputAdornment"
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
import SearchRoundedIcon from "@mui/icons-material/SearchRounded"
import SensorsRoundedIcon from "@mui/icons-material/SensorsRounded"
import type { CategoriaPeso, Galpon, LogConteo } from "../types/produccion.types"

interface CountsTableProps {
  counts: LogConteo[]
  galpones: Galpon[]
  categorias: CategoriaPeso[]
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

export default function CountsTable({ counts, galpones, categorias }: CountsTableProps) {
  const [search, setSearch] = useState("")
  const [selectedGalpon, setSelectedGalpon] = useState<number | "all">("all")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedAction, setSelectedAction] = useState<string>("all")
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  const filteredCounts = counts.filter((c) => {
    const galponName = c.galpon?.nombre ?? galpones.find((g) => g.id === c.idGalpon)?.nombre ?? `Galpón ${c.idGalpon}`
    const categoryName = c.categoriaPeso?.nombre ?? categorias.find((cat) => cat.codigo === c.codigoCategoriaPeso)?.nombre ?? c.codigoCategoriaPeso
    const formattedDate = new Date(c.timestamp).toLocaleString("es-CO")

    const matchesSearch =
      search.trim() === "" ||
      galponName.toLowerCase().includes(search.toLowerCase()) ||
      categoryName.toLowerCase().includes(search.toLowerCase()) ||
      c.id.toString().includes(search) ||
      formattedDate.includes(search)

    const matchesGalpon = selectedGalpon === "all" || c.idGalpon === selectedGalpon
    const matchesCategory = selectedCategory === "all" || c.codigoCategoriaPeso === selectedCategory
    const matchesAction =
      selectedAction === "all" ||
      (selectedAction === "plus" && c.cantidad > 0) ||
      (selectedAction === "minus" && c.cantidad < 0)

    return matchesSearch && matchesGalpon && matchesCategory && matchesAction
  })

  const paginatedCounts = filteredCounts.slice(
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
      {/* Table Filter Toolbar */}
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
            Registro Detallado de Conteos
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.825rem" }}>
            Historial cronológico de eventos registrados por sensores y operarios ({filteredCounts.length} registros)
          </Typography>
        </Box>

        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.2 }}>
          {/* Search bar */}
          <TextField
            placeholder="Buscar por ID, galpón, fecha..."
            size="small"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon fontSize="small" sx={{ color: "text.disabled" }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              minWidth: 200,
              "& .MuiInputBase-root": {
                minHeight: 38,
                borderRadius: 1,
                bgcolor: "#ffffff",
                fontSize: "0.85rem",
              },
            }}
          />

          {/* Galpón Selector */}
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

          {/* Category Selector */}
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <Select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value)
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
              <MenuItem value="all">Todas las categ.</MenuItem>
              {categorias.map((cat) => (
                <MenuItem key={cat.codigo} value={cat.codigo}>
                  {cat.nombre} ({cat.codigo})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Action (+ / -) Selector */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value)
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
              <MenuItem value="all">Todos los tipos</MenuItem>
              <MenuItem value="plus">+1 Ingreso</MenuItem>
              <MenuItem value="minus">-1 Descarte</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Table View */}
      <TableContainer>
        <Table sx={{ minWidth: 700 }} aria-label="tabla de conteos de produccion">
          <TableHead sx={{ bgcolor: "#faf7f2" }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800, fontSize: "0.8rem", color: "text.secondary", py: 1.2 }}>
                # ID
              </TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: "0.8rem", color: "text.secondary", py: 1.2 }}>
                FECHA Y HORA
              </TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: "0.8rem", color: "text.secondary", py: 1.2 }}>
                GALPÓN
              </TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: "0.8rem", color: "text.secondary", py: 1.2 }}>
                CATEGORÍA DE PESO
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, fontSize: "0.8rem", color: "text.secondary", py: 1.2 }}>
                CANTIDAD / ACCIÓN
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, fontSize: "0.8rem", color: "text.secondary", py: 1.2 }}>
                CANAL / ORIGEN
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {paginatedCounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6, color: "text.secondary" }}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    No se encontraron registros de conteo
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.disabled", mt: 0.5 }}>
                    Intenta cambiar los filtros seleccionados o realiza un nuevo conteo.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedCounts.map((row) => {
                const dateObj = new Date(row.timestamp)
                const dateStr = dateObj.toLocaleDateString("es-CO", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
                const timeStr = dateObj.toLocaleTimeString("es-CO", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })

                const galponObj = row.galpon ?? galpones.find((g) => g.id === row.idGalpon)
                const catObj = row.categoriaPeso ?? categorias.find((c) => c.codigo === row.codigoCategoriaPeso)
                const catColor = CATEGORY_COLORS[row.codigoCategoriaPeso] || {
                  bg: "#f1f5f9",
                  text: "#334155",
                  border: "#cbd5e1",
                }

                return (
                  <TableRow
                    key={row.id}
                    hover
                    sx={{
                      "&:last-child td, &:last-child th": { border: 0 },
                      transition: "background-color 0.1s",
                    }}
                  >
                    {/* ID Column */}
                    <TableCell sx={{ fontWeight: 700, color: "text.secondary", fontSize: "0.85rem" }}>
                      #{row.id}
                    </TableCell>

                    {/* Date & Time */}
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary" }}>
                        {timeStr}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
                        {dateStr}
                      </Typography>
                    </TableCell>

                    {/* Galpon */}
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary" }}>
                        {galponObj?.nombre ?? `Galpón ${row.idGalpon}`}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
                        {galponObj?.gallinasActuales?.toLocaleString() ?? 0} aves
                      </Typography>
                    </TableCell>

                    {/* Categoria */}
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          {catObj?.pesoMinG && catObj?.pesoMaxG
                            ? `${catObj.pesoMinG}-${catObj.pesoMaxG}g`
                            : catObj?.pesoMinG
                            ? `>${catObj.pesoMinG}g`
                            : catObj?.pesoMaxG
                            ? `<${catObj.pesoMaxG}g`
                            : ""}
                        </Typography>
                      </Box>
                    </TableCell>

                    {/* Cantidad / Accion */}
                    <TableCell align="center">
                      {row.cantidad > 0 ? (
                        <Chip
                          label="+1 Conteo"
                          size="small"
                          sx={{
                            fontWeight: 800,
                            fontSize: "0.75rem",
                            borderRadius: 0.8,
                            bgcolor: "#dcfce7",
                            color: "#15803d",
                            border: "1px solid #86efac",
                          }}
                        />
                      ) : (
                        <Chip
                          label="-1 Descarte / Ajuste"
                          size="small"
                          sx={{
                            fontWeight: 800,
                            fontSize: "0.75rem",
                            borderRadius: 0.8,
                            bgcolor: "#fee2e2",
                            color: "#b91c1c",
                            border: "1px solid #fca5a5",
                          }}
                        />
                      )}
                    </TableCell>

                    {/* Origen / Canal */}
                    <TableCell align="right">
                      <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
                        <SensorsRoundedIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                        <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
                          Sensor IoT / MQTT
                        </Typography>
                      </Box>
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
        rowsPerPageOptions={[10, 25, 50, 100]}
        component="div"
        count={filteredCounts.length}
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
