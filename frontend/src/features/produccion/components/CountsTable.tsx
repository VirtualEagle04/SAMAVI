import { useState } from "react";
import type { ChangeEvent } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CategoryBadge from "../../../components/atoms/CategoryBadge";
import {
  productionTableActionsSx,
  productionTableCardSx,
  productionTableFiltersSx,
  productionTableMobileCardSx,
  productionTableMobilePrimaryTextSx,
  productionTablePaginationSx,
  productionTableSx,
  productionTableTitleSx,
  productionTableToolbarSx,
} from "./productionTableStyles";
import {
  formatProductionDate,
  formatProductionDateTime,
  formatProductionTime,
} from "./productionDateFormatters";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import SensorsRoundedIcon from "@mui/icons-material/SensorsRounded";
import type {
  CategoriaPeso,
  Galpon,
  LogConteo,
} from "../types/produccion.types";

interface CountsTableProps {
  counts: LogConteo[];
  galpones: Galpon[];
  categorias: CategoriaPeso[];
}

export default function CountsTable({
  counts,
  galpones,
  categorias,
}: CountsTableProps) {
  const [search, setSearch] = useState("");
  const [selectedGalpon, setSelectedGalpon] = useState<number | "all">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedAction, setSelectedAction] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const filteredCounts = counts.filter((c) => {
    const galponName =
      c.galpon?.nombre ??
      galpones.find((g) => g.id === c.idGalpon)?.nombre ??
      `Galpón ${c.idGalpon}`;
    const categoryName =
      c.categoriaPeso?.nombre ??
      categorias.find((cat) => cat.codigo === c.codigoCategoriaPeso)?.nombre ??
      c.codigoCategoriaPeso;
    const formattedDate = formatProductionDateTime(c.timestamp);

    const matchesSearch =
      search.trim() === "" ||
      galponName.toLowerCase().includes(search.toLowerCase()) ||
      categoryName.toLowerCase().includes(search.toLowerCase()) ||
      c.id.toString().includes(search) ||
      formattedDate.includes(search);

    const matchesGalpon =
      selectedGalpon === "all" || c.idGalpon === selectedGalpon;
    const matchesCategory =
      selectedCategory === "all" || c.codigoCategoriaPeso === selectedCategory;
    const matchesAction =
      selectedAction === "all" ||
      (selectedAction === "plus" && c.cantidad > 0) ||
      (selectedAction === "minus" && c.cantidad < 0);

    return matchesSearch && matchesGalpon && matchesCategory && matchesAction;
  });

  const paginatedCounts = filteredCounts.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Card
      elevation={0}
      sx={productionTableCardSx}
    >
      {/* Table Filter Toolbar */}
      <Box
        sx={productionTableToolbarSx}
      >
        <Box>
          <Typography
            variant="h6"
            sx={productionTableTitleSx}
          >
            Historial de Conteos en Vivo
          </Typography>
        </Box>

        <Box
          sx={productionTableActionsSx}
        >
          {/* Search bar */}
          <TextField
            placeholder="Buscar por ID, galpón, fecha..."
            size="small"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon
                      fontSize="small"
                      sx={{ color: "text.disabled" }}
                    />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              width: { xs: "100%", sm: 220 },
              "& .MuiInputBase-root": {
                minHeight: 40,
                bgcolor: "background.paper",
                fontSize: "0.875rem",
              },
            }}
          />

          {/* Galpón Selector */}
          <FormControl size="small" sx={{ ...productionTableFiltersSx, minWidth: 0, width: { xs: "calc(50% - 4px)", sm: 140 } }}>
            <Select
              value={selectedGalpon}
              onChange={(e) => {
                setSelectedGalpon(
                  e.target.value === "all" ? "all" : Number(e.target.value),
                );
                setPage(0);
              }}
              sx={{
                minHeight: 40,
                fontWeight: 600,
                bgcolor: "background.paper",
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
          <FormControl size="small" sx={{ ...productionTableFiltersSx, minWidth: 0, width: { xs: "calc(50% - 4px)", sm: 150 } }}>
            <Select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(0);
              }}
              sx={{
                minHeight: 40,
                fontWeight: 600,
                bgcolor: "background.paper",
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
          <FormControl size="small" sx={{ ...productionTableFiltersSx, minWidth: 0, width: { xs: "calc(50% - 4px)", sm: 140 } }}>
            <Select
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value);
                setPage(0);
              }}
              sx={{
                minHeight: 40,
                fontWeight: 600,
                bgcolor: "background.paper",
              }}
            >
              <MenuItem value="all">Todos los tipos</MenuItem>
              <MenuItem value="plus">+1 Ingreso</MenuItem>
              <MenuItem value="minus">-1 Descarte</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      <Box sx={{ display: { xs: "grid", sm: "none" }, gap: 1, p: 1.5 }}>
        {paginatedCounts.length === 0 ? (
          <Box sx={{ py: 4, textAlign: "center", color: "text.secondary" }}>
            <Typography sx={{ fontWeight: 600 }}>No se encontraron registros de conteo</Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>Cambia los filtros o registra un nuevo conteo.</Typography>
          </Box>
        ) : paginatedCounts.map((row) => {
          const barn = row.galpon ?? galpones.find((g) => g.id === row.idGalpon)
          const category = row.categoriaPeso ?? categorias.find((cat) => cat.codigo === row.codigoCategoriaPeso)
          const positive = row.cantidad > 0
          return (
            <Box key={row.id} sx={productionTableMobileCardSx}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, mb: 1 }}>
                <Typography variant="caption" color="text.secondary">{formatProductionDateTime(row.timestamp)}</Typography>
                <Chip size="small" label={positive ? "+1 Conteo" : "−1 Descarte"} color={positive ? "success" : "error"} />
              </Box>
              <Typography sx={productionTableMobilePrimaryTextSx}>{barn?.nombre ?? `Galpón ${row.idGalpon}`}</Typography>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1 }}>
                <CategoryBadge codigo={row.codigoCategoriaPeso} nombre={category?.nombre ?? row.codigoCategoriaPeso} />
                <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: "text.secondary" }}>
                  <SensorsRoundedIcon sx={{ fontSize: 16 }} />
                  <Typography variant="caption">Sensor IoT</Typography>
                  <Typography variant="caption">#{row.id}</Typography>
                </Box>
              </Box>
            </Box>
          )
        })}
      </Box>

      {/* Desktop table view */}
      <TableContainer sx={{ display: { xs: "none", sm: "block" } }}>
        <Table
          sx={productionTableSx}
          aria-label="tabla de conteos de produccion"
        >
        <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  fontWeight: 800,
                  fontSize: "0.8rem",
                  color: "text.secondary",
                  py: 1.2,
                }}
              >
                # ID
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: 800,
                  fontSize: "0.8rem",
                  color: "text.secondary",
                  py: 1.2,
                }}
              >
                FECHA Y HORA
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: 800,
                  fontSize: "0.8rem",
                  color: "text.secondary",
                  py: 1.2,
                }}
              >
                GALPÓN
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: 800,
                  fontSize: "0.8rem",
                  color: "text.secondary",
                  py: 1.2,
                }}
              >
                CATEGORÍA DE PESO
              </TableCell>
              <TableCell
                align="center"
                sx={{
                  fontWeight: 800,
                  fontSize: "0.8rem",
                  color: "text.secondary",
                  py: 1.2,
                }}
              >
                CANTIDAD / ACCIÓN
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  fontWeight: 800,
                  fontSize: "0.8rem",
                  color: "text.secondary",
                  py: 1.2,
                }}
              >
                CANAL / ORIGEN
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {paginatedCounts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  align="center"
                  sx={{ py: 6, color: "text.secondary" }}
                >
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    No se encontraron registros de conteo
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: "text.disabled", mt: 0.5 }}
                  >
                    Intenta cambiar los filtros seleccionados o realiza un nuevo
                    conteo.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedCounts.map((row) => {
                const dateStr = formatProductionDate(row.timestamp);
                const timeStr = formatProductionTime(row.timestamp);

                const galponObj =
                  row.galpon ?? galpones.find((g) => g.id === row.idGalpon);
                const catObj =
                  row.categoriaPeso ??
                  categorias.find((c) => c.codigo === row.codigoCategoriaPeso);

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
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        color: "text.secondary",
                        fontSize: "0.85rem",
                      }}
                    >
                      #{row.id}
                    </TableCell>

                    {/* Date & Time */}
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 700, color: "text.primary" }}
                      >
                        {dateStr}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: "text.secondary", fontSize: "0.75rem" }}
                      >
                        {timeStr}
                      </Typography>
                    </TableCell>

                    {/* Galpon */}
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 700, color: "text.primary" }}
                    >
                      {galponObj?.nombre ?? `Galpón ${row.idGalpon}`}
                    </Typography>
                    </TableCell>

                    {/* Categoria */}
                    <TableCell>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <CategoryBadge
                          codigo={row.codigoCategoriaPeso}
                          nombre={catObj?.nombre ?? row.codigoCategoriaPeso}
                        />
                        <Typography
                          variant="caption"
                          sx={{ color: "text.secondary" }}
                        >
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
                      <Box
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 0.5,
                        }}
                      >
                        <SensorsRoundedIcon
                          sx={{ fontSize: 16, color: "text.secondary" }}
                        />
                        <Typography
                          variant="caption"
                          sx={{ fontWeight: 600, color: "text.secondary" }}
                        >
                          Sensor IoT / MQTT
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        rowsPerPageOptions={[10, 25, 50]}
        component="div"
        count={filteredCounts.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="Filas por página:"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} de ${count}`
        }
        sx={productionTablePaginationSx}
      />
    </Card>
  );
}
