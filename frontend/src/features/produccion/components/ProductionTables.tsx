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

const dateLabel = (value: string) =>
  new Date(value).toLocaleDateString("es-CO", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
const stampLabel = (value: string) =>
  new Intl.DateTimeFormat("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));

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
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1.5,
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
            Bodega y Remanentes
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Saldo guardado en cada corte semanal. Las ventas actuales se
            calculan sumando cierres diarios y despachos.
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
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
        <Table sx={{ minWidth: 650 }}>
          <TableHead sx={{ bgcolor: "#faf7f2" }}>
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
                  <TableCell>{dateLabel(group.fechaCorte)}</TableCell>
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
        borderRadius: 1.5,
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
          <TableHead sx={{ bgcolor: "#faf7f2" }}>
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
                  <TableCell>{dateLabel(row.fecha)}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>
                    {row.galpon?.nombre ?? `Galpón ${row.idGalpon}`}
                  </TableCell>
                  <TableCell>{stampLabel(row.cerradoEn)}</TableCell>
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
