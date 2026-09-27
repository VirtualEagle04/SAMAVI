import { useState } from "react";
import type { ChangeEvent } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
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
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import AddCircleOutlineRoundedIcon from "@mui/icons-material/AddCircleOutlineRounded";
import type {
  CategoriaPeso,
  CierreDiario,
  CierreProduccionDia,
  Galpon,
} from "../types/produccion.types";

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
  const [selectedGalpon, setSelectedGalpon] = useState<number | "all">("all");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const filteredCierres = cierres.filter((c) => {
    const cierreDateStr = c.fecha.slice(0, 10);
    const matchesDate = selectedDate === "" || cierreDateStr === selectedDate;
    const matchesGalpon =
      selectedGalpon === "all" || c.idGalpon === selectedGalpon;
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
    if ((selectedDate && date !== selectedDate) || (selectedGalpon !== "all" && marker.idGalpon !== selectedGalpon)) continue;
    const key = `${marker.idGalpon}:${date}`;
    const group = groupedMap.get(key) ?? { idGalpon: marker.idGalpon, fecha: marker.fecha, galpon: marker.galpon, categorias: [], cerradoEn: marker.cerradoEn };
    group.cerradoEn = marker.cerradoEn;
    groupedMap.set(key, group);
  }
  const groupedCierres = Array.from(groupedMap.values()).sort((a, b) => b.fecha.localeCompare(a.fecha) || a.idGalpon - b.idGalpon);

  const paginatedCierres = groupedCierres.slice(
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
          <Typography
            variant="h6"
            sx={{ fontWeight: 800, color: "text.primary", fontSize: "1.1rem" }}
          >
            Cierres Diarios y Consolidado de Empaque
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", fontSize: "0.825rem" }}
          >
            Liquidaci�n de producci�n consolidada en bandejas de 30 unidades y
            sobrantes
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 1.2,
          }}
        >
          {/* Date filter */}
          <TextField
            type="date"
            size="small"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setPage(0);
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
                setSelectedGalpon(
                  e.target.value === "all" ? "all" : Number(e.target.value),
                );
                setPage(0);
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
                GALP�N
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: 800,
                  fontSize: "0.8rem",
                  color: "text.secondary",
                  py: 1.2,
                }}
              >
                CATEGOR�A
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
            {paginatedCierres.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  align="center"
                  sx={{ py: 6, color: "text.secondary" }}
                >
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    No hay registros de cierres diarios disponibles
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: "text.disabled", mt: 0.5 }}
                  >
                    Realiza un cierre diario para consolidar los conteos en
                    bandejas y stock.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedCierres.map((group, idx) => {
                const dateObj = new Date(group.fecha);
                const dateStr = dateObj.toLocaleDateString("es-CO", {
                  timeZone: "UTC",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                });

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
                        {group.categorias.length === 0 ? <Chip size="small" label="Sin producción" variant="outlined" /> : group.categorias.map((row) => {
                          const catObj =
                            row.categoriaPeso ??
                            categorias.find(
                              (c) => c.codigo === row.codigoCategoriaPeso,
                            );
                          return (
                            <CategoryBadge
                              key={row.codigoCategoriaPeso}
                              codigo={row.codigoCategoriaPeso}
                              nombre={catObj?.nombre ?? row.codigoCategoriaPeso}
                              cantidad={row.cantidadBandejas}
                            />
                          );
                        })}
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
                          bgcolor: "#f0fdf4",
                          color: "#166534",
                          border: "1px solid #86efac",
                        }}
                      />
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
        count={groupedCierres.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="Filas por página:"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} de ${count}`
        }
        sx={{ borderTop: "1px solid", borderColor: "divider" }}
      />
    </Card>
  );
}
