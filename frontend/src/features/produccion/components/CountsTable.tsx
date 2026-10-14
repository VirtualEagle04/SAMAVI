import { useMemo } from "react";
import EmptyState from "../../../components/molecules/EmptyState";
import type { ChangeEvent } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import CategoryBadge from "../../../components/atoms/CategoryBadge";
import TableToolbar from "../../../components/molecules/TableToolbar";
import type { FilterField } from "../../../components/molecules/filterTypes";
import { useTableFilters } from "../../../hooks/useTableFilters";
import {
  tableCardSx,
  tableMobileCardSx,
  tableMobilePrimaryTextSx,
  tablePaginationLabels,
  tablePaginationSx,
  tableSx,
} from "../../../components/tableStyles";
import {
  formatProductionDate,
  formatProductionDateTime,
  formatProductionTime,
} from "./productionDateFormatters";
import SensorsRoundedIcon from "@mui/icons-material/SensorsRounded";
import type {
  CategoriaPeso,
  Galpon,
  LogConteo,
} from "../types/produccion.types";

const FILTER_KEYS = ["galpon", "categoria", "tipo"] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

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
  const filters = useTableFilters(FILTER_KEYS);
  const { search, values } = filters;

  const filterFields: FilterField[] = useMemo(
    () => [
      {
        key: "galpon",
        type: "select",
        label: "Galpón",
        allLabel: "Todos los galpones",
        options: galpones.map((g) => ({ value: String(g.id), label: g.nombre })),
      },
      {
        key: "categoria",
        type: "select",
        label: "Categoría de peso",
        allLabel: "Todas las categorías",
        options: categorias.map((cat) => ({
          value: cat.codigo,
          label: `${cat.nombre} (${cat.codigo})`,
        })),
      },
      {
        key: "tipo",
        type: "select",
        label: "Tipo de registro",
        allLabel: "Todos los tipos",
        options: [
          { value: "plus", label: "+1 Ingreso" },
          { value: "minus", label: "-1 Descarte" },
        ],
      },
    ],
    [galpones, categorias],
  );

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
      values.galpon === "" || c.idGalpon === Number(values.galpon);
    const matchesCategory =
      values.categoria === "" || c.codigoCategoriaPeso === values.categoria;
    const matchesAction =
      values.tipo === "" ||
      (values.tipo === "plus" && c.cantidad > 0) ||
      (values.tipo === "minus" && c.cantidad < 0);

    return matchesSearch && matchesGalpon && matchesCategory && matchesAction;
  });

  const { rows: paginatedCounts, page } = filters.paginate(filteredCounts);

  const handleChangeRowsPerPage = (event: ChangeEvent<HTMLInputElement>) => {
    filters.setRowsPerPage(parseInt(event.target.value, 10));
  };

  return (
    <Card
      elevation={0}
      sx={tableCardSx}
    >
      <TableToolbar
        title="Historial de Conteos en Vivo"
        search={{
          value: search,
          onChange: filters.setSearch,
          placeholder: "Buscar por ID, galpón, fecha...",
        }}
        filters={{
          fields: filterFields,
          values,
          activeCount: filters.activeCount,
          onChange: (key, value) => filters.setValue(key as FilterKey, value),
          onReset: filters.reset,
        }}
      />

      {paginatedCounts.length === 0 ? (
        <EmptyState
          icon={<SensorsRoundedIcon />}
          title="No se encontraron registros de conteo"
          description="Cambia los filtros o registra un nuevo conteo."
        />
      ) : (
        <>
        <Box sx={{ display: { xs: "grid", sm: "none" }, gap: 1, p: 1.5 }}>
          {paginatedCounts.map((row) => {
            const barn = row.galpon ?? galpones.find((g) => g.id === row.idGalpon)
            const category = row.categoriaPeso ?? categorias.find((cat) => cat.codigo === row.codigoCategoriaPeso)
            const positive = row.cantidad > 0
            return (
              <Box key={row.id} sx={tableMobileCardSx}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">{formatProductionDateTime(row.timestamp)}</Typography>
                  <Chip size="small" label={positive ? "+1 Conteo" : "−1 Descarte"} color={positive ? "success" : "error"} />
                </Box>
                <Typography sx={tableMobilePrimaryTextSx}>{barn?.nombre ?? `Galpón ${row.idGalpon}`}</Typography>
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
            sx={tableSx}
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
              {paginatedCounts.map((row) => {
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
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <TablePagination
          rowsPerPageOptions={[10, 25, 50]}
          component="div"
          count={filteredCounts.length}
          rowsPerPage={filters.rowsPerPage}
          page={page}
          onPageChange={(_event, newPage) => filters.setPage(newPage)}
          onRowsPerPageChange={handleChangeRowsPerPage}
          {...tablePaginationLabels}
          sx={tablePaginationSx}
        />
        </>
      )}
    </Card>
  );
}
