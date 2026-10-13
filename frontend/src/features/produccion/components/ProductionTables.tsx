import { useMemo } from "react";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import EmptyState from "../../../components/molecules/EmptyState";
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
import type {
  BodegaStock,
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
import {
  formatProductionDate,
  formatProductionDateTime,
} from "./productionDateFormatters";

const FILTER_KEYS = ["fecha", "galpon"] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

function buildFilterFields(galpones: Galpon[], dateLabel: string): FilterField[] {
  return [
    { key: "fecha", type: "date", label: dateLabel },
    {
      key: "galpon",
      type: "select",
      label: "Galpón",
      allLabel: "Todos los galpones",
      options: galpones.map((g) => ({ value: String(g.id), label: g.nombre })),
    },
  ];
}

export function BodegaTable({
  rows,
  galpones,
}: {
  rows: BodegaStock[];
  galpones: Galpon[];
}) {
  const filters = useTableFilters(FILTER_KEYS);
  const { fecha: date, galpon: filter } = filters.values;
  const filtered = useMemo(
    () =>
      rows.filter(
        (row) =>
          (filter === "" || row.idGalpon === Number(filter)) &&
          (!date || row.fechaCorte.slice(0, 10) === date),
      ),
    [rows, filter, date],
  );
  const grouped = useMemo(
    () =>
      Array.from(
        filtered
          .reduce((groups, row) => {
            const key = `${row.idGalpon}:${row.fechaCorte.slice(0, 10)}`;
            const group = groups.get(key) ?? {
              idGalpon: row.idGalpon,
              fechaCorte: row.fechaCorte,
              galpon: row.galpon,
              categorias: [] as BodegaStock[],
            };
            group.categorias.push(row);
            groups.set(key, group);
            return groups;
          }, new Map<string, { idGalpon: number; fechaCorte: string; galpon?: Galpon; categorias: BodegaStock[] }>())
          .values(),
      ),
    [filtered],
  );
  const { rows: pageRows, page } = filters.paginate(grouped);
  return (
    <Card elevation={0} sx={tableCardSx}>
      <TableToolbar
        title="Historial de Bodegas y Remanentes"
        filters={{
          fields: buildFilterFields(galpones, "Fecha de corte"),
          values: filters.values,
          activeCount: filters.activeCount,
          onChange: (key, value) => filters.setValue(key as FilterKey, value),
          onReset: filters.reset,
        }}
      />
      {grouped.length === 0 ? (
        <EmptyState
          icon={<Inventory2RoundedIcon />}
          title="Sin remanentes"
          description="No hay remanentes para los filtros seleccionados."
        />
      ) : (
        <>
        <Box sx={{ display: { xs: "grid", sm: "none" }, gap: 1, p: 1.5 }}>
          {pageRows.map((group) => {
            const total = group.categorias.reduce((sum, row) => sum + row.cantidadBandejas, 0);
            return (
              <Box key={`${group.idGalpon}-${group.fechaCorte}`} sx={tableMobileCardSx}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
                  <Box>
                    <Typography sx={tableMobilePrimaryTextSx}>{group.galpon?.nombre ?? `Galpón ${group.idGalpon}`}</Typography>
                    <Typography variant="caption" color="text.secondary">{formatProductionDate(group.fechaCorte)}</Typography>
                  </Box>
                  <Chip size="small" color="info" label="Saldo de corte" />
                </Box>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 1.25 }}>
                  {group.categorias.map((row) => (
                    <CategoryBadge key={row.codigoCategoriaPeso} codigo={row.codigoCategoriaPeso} nombre={row.categoriaPeso?.nombre ?? row.codigoCategoriaPeso} cantidad={row.cantidadBandejas} />
                  ))}
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1.25, pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
                  <Typography variant="caption" color="text.secondary">Total de bandejas</Typography>
                  <Typography sx={{ fontWeight: 700 }}>{total.toLocaleString("es-CO")}</Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
        <TableContainer sx={{ display: { xs: "none", sm: "block" } }}>
          <Table sx={tableSx}>
          <TableHead>
              <TableRow>
                {[
                  "FECHA DE CORTE",
                  "GALPÓN",
                  "REMANENTES POR CATEGORÍA",
                  "TOTAL BANDEJAS",
                  "USO",
                ].map((heading, index) => (
                  <TableCell
                    key={heading}
                    align={index === 3 ? "right" : "left"}
                    sx={{ fontWeight: 800 }}
                  >
                    {heading}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {pageRows.map((group) => (
                  <TableRow key={`${group.idGalpon}-${group.fechaCorte}`} hover>
                    <TableCell>{formatProductionDate(group.fechaCorte)}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      {group.galpon?.nombre ?? `Galpón ${group.idGalpon}`}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.7 }}>
                        {group.categorias.map((row) => (
                          <CategoryBadge
                            key={row.codigoCategoriaPeso}
                            codigo={row.codigoCategoriaPeso}
                            nombre={
                              row.categoriaPeso?.nombre ?? row.codigoCategoriaPeso
                            }
                            cantidad={row.cantidadBandejas}
                          />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>
                      {group.categorias
                        .reduce((sum, row) => sum + row.cantidadBandejas, 0)
                        .toLocaleString("en-US")}
                    </TableCell>
                    <TableCell>
                      <Chip size="small" color="info" label="Saldo de corte" />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={grouped.length}
          page={page}
          rowsPerPage={filters.rowsPerPage}
          rowsPerPageOptions={[10, 25, 50]}
          onPageChange={(_, next) => filters.setPage(next)}
          onRowsPerPageChange={(event) => {
            filters.setRowsPerPage(Number(event.target.value));
          }}
          {...tablePaginationLabels}
          sx={tablePaginationSx}
        />
        </>
      )}
    </Card>
  );
}

export function ProductionClosuresTable({
  rows,
  galpones,
}: {
  rows: CierreProduccionDia[];
  galpones: Galpon[];
}) {
  const filters = useTableFilters(FILTER_KEYS);
  const { fecha: date, galpon: filter } = filters.values;
  const filtered = useMemo(
    () =>
      rows.filter(
        (row) =>
          (filter === "" || row.idGalpon === Number(filter)) &&
          (!date || row.fecha.slice(0, 10) === date),
      ),
    [rows, filter, date],
  );
  const { rows: pageRows, page } = filters.paginate(filtered);
  return (
    <Card elevation={0} sx={tableCardSx}>
      <TableToolbar
        title="Cierres realizados"
        description="Incluye los galpones que cerraron el día sin producción registrada."
        filters={{
          fields: buildFilterFields(galpones, "Fecha"),
          values: filters.values,
          activeCount: filters.activeCount,
          onChange: (key, value) => filters.setValue(key as FilterKey, value),
          onReset: filters.reset,
        }}
      />
      {filtered.length === 0 ? (
        <EmptyState
          icon={<EventAvailableRoundedIcon />}
          title="Sin cierres registrados"
          description="No hay cierres registrados para los filtros seleccionados."
        />
      ) : (
        <>
        <TableContainer>
          <Table sx={{ minWidth: 520 }}>
          <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>FECHA DEL CIERRE</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>GALPÓN</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>REGISTRADO EN</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>ESTADO</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pageRows.map((row) => (
                  <TableRow key={`${row.idGalpon}-${row.fecha}`} hover>
                    <TableCell>{formatProductionDate(row.fecha)}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      {row.galpon?.nombre ?? `Galpón ${row.idGalpon}`}
                    </TableCell>
                    <TableCell>{formatProductionDateTime(row.cerradoEn)}</TableCell>
                    <TableCell>
                      <Chip size="small" color="success" label="Cerrado" />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          rowsPerPage={filters.rowsPerPage}
          rowsPerPageOptions={[10, 25, 50]}
          onPageChange={(_, next) => filters.setPage(next)}
          onRowsPerPageChange={(event) => {
            filters.setRowsPerPage(Number(event.target.value));
          }}
          {...tablePaginationLabels}
        />
        </>
      )}
    </Card>
  );
}
