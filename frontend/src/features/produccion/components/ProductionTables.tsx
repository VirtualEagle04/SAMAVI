import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
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
import type {
  BodegaStock,
  CierreProduccionDia,
  Galpon,
} from "../types/produccion.types";
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
} from "./productionDateFormatters";

export function BodegaTable({
  rows,
  galpones,
}: {
  rows: BodegaStock[];
  galpones: Galpon[];
}) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filter, setFilter] = useState<number | "all">("all");
  const [date, setDate] = useState("");
  const filtered = useMemo(
    () =>
      rows.filter(
        (row) =>
          (filter === "all" || row.idGalpon === filter) &&
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
  return (
    <Card
      elevation={0}
      sx={productionTableCardSx}
    >
      <Box
        sx={productionTableToolbarSx}
      >
        <Box>
          <Typography variant="h6" sx={productionTableTitleSx}>
            Historial de Bodegas y Remanentes
          </Typography>
        </Box>
        <Box sx={productionTableActionsSx}>
          <TextField
            type="date"
            size="small"
            label="Fecha de corte"
            value={date}
            onChange={(event) => {
              setDate(event.target.value);
              setPage(0);
            }}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ ...productionTableFiltersSx, width: { xs: "calc(50% - 4px)", sm: 150 }, minWidth: 0 }}
          />
          <FormControl size="small" sx={{ ...productionTableFiltersSx, width: { xs: "calc(50% - 4px)", sm: 170 }, minWidth: 0 }}>
            <Select
              value={filter}
              onChange={(event) => {
                setFilter(
                  event.target.value === "all"
                    ? "all"
                    : Number(event.target.value),
                );
                setPage(0);
              }}
            >
              <MenuItem value="all">Todos los galpones</MenuItem>
              {galpones.map((barn) => (
                <MenuItem key={barn.id} value={barn.id}>
                  {barn.nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>
      <Box sx={{ display: { xs: "grid", sm: "none" }, gap: 1, p: 1.5 }}>
        {grouped.length === 0 ? (
          <Box sx={{ py: 4, textAlign: "center", color: "text.secondary" }}>
            No hay remanentes para los filtros seleccionados.
          </Box>
        ) : grouped.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map((group) => {
          const total = group.categorias.reduce((sum, row) => sum + row.cantidadBandejas, 0);
          return (
            <Box key={`${group.idGalpon}-${group.fechaCorte}`} sx={productionTableMobileCardSx}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
                <Box>
                  <Typography sx={productionTableMobilePrimaryTextSx}>{group.galpon?.nombre ?? `Galpón ${group.idGalpon}`}</Typography>
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
        <Table sx={productionTableSx}>
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
            {grouped
              .slice(page * rowsPerPage, (page + 1) * rowsPerPage)
              .map((group) => (
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
            {grouped.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  align="center"
                  sx={{ py: 5, color: "text.secondary" }}
                >
                  No hay remanentes para los filtros seleccionados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={grouped.length}
        page={page}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={[10, 25, 50]}
        onPageChange={(_, next) => setPage(next)}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(Number(event.target.value));
          setPage(0);
        }}
        labelRowsPerPage="Filas por página:"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} de ${count}`
        }
        sx={productionTablePaginationSx}
      />
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
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filter, setFilter] = useState<number | "all">("all");
  const [date, setDate] = useState("");
  const filtered = useMemo(
    () =>
      rows.filter(
        (row) =>
          (filter === "all" || row.idGalpon === filter) &&
          (!date || row.fecha.slice(0, 10) === date),
      ),
    [rows, filter, date],
  );
  return (
    <Card
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          p: 2,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Cierres realizados
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Incluye los galpones que cerraron el día sin producción registrada.
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <TextField
            type="date"
            size="small"
            label="Fecha"
            value={date}
            onChange={(event) => {
              setDate(event.target.value);
              setPage(0);
            }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <FormControl size="small" sx={{ minWidth: 170 }}>
            <Select
              value={filter}
              onChange={(event) => {
                setFilter(
                  event.target.value === "all"
                    ? "all"
                    : Number(event.target.value),
                );
                setPage(0);
              }}
            >
              <MenuItem value="all">Todos los galpones</MenuItem>
              {galpones.map((barn) => (
                <MenuItem key={barn.id} value={barn.id}>
                  {barn.nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>
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
            {filtered
              .slice(page * rowsPerPage, (page + 1) * rowsPerPage)
              .map((row) => (
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
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  align="center"
                  sx={{ py: 5, color: "text.secondary" }}
                >
                  No hay cierres registrados para los filtros seleccionados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={filtered.length}
        page={page}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={[10, 25, 50]}
        onPageChange={(_, next) => setPage(next)}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(Number(event.target.value));
          setPage(0);
        }}
        labelRowsPerPage="Filas por página:"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} de ${count}`
        }
      />
    </Card>
  );
}
