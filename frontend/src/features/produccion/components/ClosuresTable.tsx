import { useMemo } from "react";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import EmptyState from "../../../components/molecules/EmptyState";
import type { ChangeEvent } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
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
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import AddCircleOutlineRoundedIcon from "@mui/icons-material/AddCircleOutlineRounded";
import type {
  CategoriaPeso,
  CierreDiario,
  CierreProduccionDia,
  Galpon,
} from "../types/produccion.types";
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
import { formatProductionDate } from "./productionDateFormatters";

const FILTER_KEYS = ["fecha", "galpon"] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

interface ClosuresTableProps {
  cierres: CierreDiario[];
  cierresRealizados: CierreProduccionDia[];
  galpones: Galpon[];
  categorias: CategoriaPeso[];
  onOpenDailyCloseModal: () => void;
  canPerformClose: boolean;
}

export default function ClosuresTable({
  cierres,
  cierresRealizados,
  galpones,
  categorias,
  onOpenDailyCloseModal,
  canPerformClose,
}: ClosuresTableProps) {
  const filters = useTableFilters(FILTER_KEYS);
  const selectedDate = filters.values.fecha;
  const selectedGalpon = filters.values.galpon;

  const filterFields: FilterField[] = useMemo(
    () => [
      { key: "fecha", type: "date", label: "Fecha" },
      {
        key: "galpon",
        type: "select",
        label: "Galpón",
        allLabel: "Todos los galpones",
        options: galpones.map((g) => ({ value: String(g.id), label: g.nombre })),
      },
    ],
    [galpones],
  );

  const filteredCierres = cierres.filter((c) => {
    const cierreDateStr = c.fecha.slice(0, 10);
    const matchesDate = selectedDate === "" || cierreDateStr === selectedDate;
    const matchesGalpon =
      selectedGalpon === "" || c.idGalpon === Number(selectedGalpon);
    return matchesDate && matchesGalpon;
  });

  const groupedMap = filteredCierres.reduce((groups, row) => {
    const key = `${row.idGalpon}:${row.fecha.slice(0, 10)}`;
    const group = groups.get(key) ?? {
      idGalpon: row.idGalpon,
      fecha: row.fecha,
      galpon: row.galpon,
      categorias: [] as CierreDiario[],
      cerradoEn: undefined as string | undefined,
    };
    group.categorias.push(row);
    groups.set(key, group);
    return groups;
  }, new Map<string, { idGalpon: number; fecha: string; galpon?: Galpon; categorias: CierreDiario[]; cerradoEn?: string }>());
  for (const marker of cierresRealizados) {
    const date = marker.fecha.slice(0, 10);
    if (
      (selectedDate && date !== selectedDate) ||
      (selectedGalpon !== "" && marker.idGalpon !== Number(selectedGalpon))
    )
      continue;
    const key = `${marker.idGalpon}:${date}`;
    const group = groupedMap.get(key) ?? {
      idGalpon: marker.idGalpon,
      fecha: marker.fecha,
      galpon: marker.galpon,
      categorias: [],
      cerradoEn: marker.cerradoEn,
    };
    group.cerradoEn = marker.cerradoEn;
    groupedMap.set(key, group);
  }
  const groupedCierres = Array.from(groupedMap.values()).sort(
    (a, b) => b.fecha.localeCompare(a.fecha) || a.idGalpon - b.idGalpon,
  );

  const { rows: paginatedCierres, page } = filters.paginate(groupedCierres);

  const handleChangeRowsPerPage = (event: ChangeEvent<HTMLInputElement>) => {
    filters.setRowsPerPage(parseInt(event.target.value, 10));
  };

  return (
    <Card elevation={0} sx={tableCardSx}>
      <TableToolbar
        title="Historial de Cierres Diarios"
        filters={{
          fields: filterFields,
          values: filters.values,
          activeCount: filters.activeCount,
          onChange: (key, value) => filters.setValue(key as FilterKey, value),
          onReset: filters.reset,
        }}
        actions={
          canPerformClose && (
            <Button
              variant="contained"
              size="small"
              startIcon={<AddCircleOutlineRoundedIcon />}
              onClick={onOpenDailyCloseModal}
              sx={{
                borderRadius: 1,
                backgroundColor: "primary.main",
                color: "#ffffff",
                fontSize: "0.875rem",
                fontWeight: 700,
                px: 1.8,
                width: { xs: "100%", sm: "auto" },
                minHeight: 40,
                boxShadow: "none",
                "&:hover": { backgroundColor: "primary.dark" },
              }}
            >
              Efectuar Cierre
            </Button>
          )
        }
      />

      {paginatedCierres.length === 0 ? (
        <EmptyState
          icon={<EventAvailableRoundedIcon />}
          title="No hay cierres para estos filtros"
          description="Realiza un cierre diario para consolidar la producción."
        />
      ) : (
        <>
        <Box sx={{ display: { xs: "grid", sm: "none" }, gap: 1, p: 1.5 }}>
          {paginatedCierres.map((group) => {
            const barn =
              group.galpon ?? galpones.find((g) => g.id === group.idGalpon);
            const trays = group.categorias.reduce(
              (sum, row) => sum + row.cantidadBandejas,
              0,
            );
            const units = group.categorias.reduce(
              (sum, row) =>
                sum + row.cantidadBandejas * 30 + row.cantidadSobrante,
              0,
            );
            const leftovers = group.categorias.reduce(
              (sum, row) => sum + row.cantidadSobrante,
              0,
            );
            return (
              <Box
                key={`${group.idGalpon}-${group.fecha}`}
                sx={tableMobileCardSx}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Box>
                    <Typography sx={tableMobilePrimaryTextSx}>
                      {barn?.nombre ?? `Galpón ${group.idGalpon}`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatProductionDate(group.fecha)}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    label={group.cerradoEn ? "Cerrado" : "Consolidado"}
                    color="success"
                  />
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 0.75,
                    mt: 1.25,
                  }}
                >
                  {group.categorias.length === 0 ? (
                    <Chip
                      size="small"
                      label="Sin producción"
                      variant="outlined"
                    />
                  ) : (
                    group.categorias.map((row) => {
                      const category =
                        row.categoriaPeso ??
                        categorias.find(
                          (cat) => cat.codigo === row.codigoCategoriaPeso,
                        );
                      return (
                        <CategoryBadge
                          key={row.codigoCategoriaPeso}
                          codigo={row.codigoCategoriaPeso}
                          nombre={category?.nombre ?? row.codigoCategoriaPeso}
                          cantidad={row.cantidadBandejas}
                        />
                      );
                    })
                  )}
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mt: 1.25,
                    pt: 1,
                    borderTop: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Bandejas
                    </Typography>
                    <Typography sx={{ fontWeight: 700 }}>
                      {trays.toLocaleString()}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: "center" }}>
                    <Typography variant="caption" color="text.secondary">
                      Sobrantes
                    </Typography>
                    <Typography sx={{ fontWeight: 700 }}>
                      {leftovers} uds
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    <Typography variant="caption" color="text.secondary">
                      Total
                    </Typography>
                    <Typography sx={{ fontWeight: 700 }}>
                      {units.toLocaleString()} uds
                    </Typography>
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>

        {/* Desktop table */}
        <TableContainer sx={{ display: { xs: "none", sm: "block" } }}>
          <Table sx={tableSx} aria-label="tabla de cierres diarios">
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
                  FECHA
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
                  CATEGORÍA
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
                  BANDEJAS
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
                  HUEVOS SOBRANTES
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
                  TOTAL UNIDADES
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
                  ESTADO
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {paginatedCierres.map((group, idx) => {
                const dateStr = formatProductionDate(group.fecha);

                const galponObj =
                  group.galpon ?? galpones.find((g) => g.id === group.idGalpon);
                const trayTotal = group.categorias.reduce(
                  (sum, row) => sum + row.cantidadBandejas,
                  0,
                );
                const totalUnits = group.categorias.reduce(
                  (sum, row) =>
                    sum + row.cantidadBandejas * 30 + row.cantidadSobrante,
                  0,
                );

                return (
                  <TableRow
                    key={`${group.idGalpon}-${group.fecha}-${idx}`}
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
                      {galponObj?.nombre ?? `Galpón ${group.idGalpon}`}
                    </TableCell>

                    <TableCell>
                      <Box
                        sx={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 0.7,
                          maxWidth: 360,
                        }}
                      >
                        {group.categorias.length === 0 ? (
                          <Chip
                            size="small"
                            label="Sin producción"
                            variant="outlined"
                          />
                        ) : (
                          group.categorias.map((row) => {
                            const catObj =
                              row.categoriaPeso ??
                              categorias.find(
                                (c) => c.codigo === row.codigoCategoriaPeso,
                              );
                            return (
                              <CategoryBadge
                                key={row.codigoCategoriaPeso}
                                codigo={row.codigoCategoriaPeso}
                                nombre={
                                  catObj?.nombre ?? row.codigoCategoriaPeso
                                }
                                cantidad={row.cantidadBandejas}
                              />
                            );
                          })
                        )}
                      </Box>
                    </TableCell>

                    <TableCell align="center">
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 800, color: "primary.dark" }}
                      >
                        {trayTotal.toLocaleString()}
                      </Typography>
                    </TableCell>

                    <TableCell align="center">
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, color: "text.secondary" }}
                      >
                        {group.categorias
                          .reduce((sum, row) => sum + row.cantidadSobrante, 0)
                          .toLocaleString()}{" "}
                        uds
                      </Typography>
                    </TableCell>

                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 800, color: "text.primary" }}
                      >
                        {totalUnits.toLocaleString()} uds
                      </Typography>
                    </TableCell>

                    <TableCell align="center">
                      <Chip
                        icon={<CheckCircleRoundedIcon sx={{ fontSize: 14 }} />}
                        label={group.cerradoEn ? "Cerrado" : "Consolidado"}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: "0.75rem",
                          borderRadius: 0.8,
                          bgcolor: "rgba(107, 142, 98, 0.12)",
                          color: "success.dark",
                          border: "1px solid",
                          borderColor: "success.light",
                        }}
                      />
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
          count={groupedCierres.length}
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
