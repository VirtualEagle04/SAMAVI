import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import CategoryBadge from "../../../components/atoms/CategoryBadge";
import type { Pedido } from "../types/comercial.types";
import {
  commercialTableActionsSx,
  commercialTableCardSx,
  commercialTableDescriptionSx,
  commercialTableFiltersSx,
  commercialTableMobileCardSx,
  commercialTableMobilePrimaryTextSx,
  commercialTablePaginationSx,
  commercialTableSx,
  commercialTableTitleSx,
  commercialTableToolbarSx,
} from "./commercialTableStyles";

interface PedidosTableProps {
  pedidos: Pedido[];
  canOrder: boolean;
  canSell: boolean;
  onOpenDetails: (pedido: Pedido) => void;
  onOpenEdit: (pedido: Pedido) => void;
  onOpenSale: (pedido: Pedido) => void;
  filter: string;
  onFilterChange: (filter: string) => void;
}

const formatMoney = (value: number) =>
  `$${Math.round(value).toLocaleString("en-US")} COP`;

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const statusMap: Record<
  string,
  { label: string; color: "warning" | "info" | "success" | "default" }
> = {
  pendiente: { label: "Pendiente", color: "warning" },
  cargado: { label: "Listo para venta", color: "info" },
  entregado: { label: "Entregado", color: "success" },
  entregado_parcial: { label: "Entrega parcial", color: "info" },
  cancelado: { label: "Cancelado", color: "default" },
};

export default function PedidosTable({
  pedidos,
  canOrder,
  canSell,
  onOpenDetails,
  onOpenEdit,
  onOpenSale,
  filter,
  onFilterChange,
}: PedidosTableProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const visibleOrders = useMemo(
    () =>
      pedidos.filter((p) => {
        const matchesFilter =
          filter === "todos" ||
          (filter === "entregado"
            ? p.estado === "entregado" || p.estado === "entregado_parcial"
            : p.estado === filter);

        const searchLower = search.toLowerCase();
        const matchesSearch =
          search.trim() === "" ||
          `${p.mayorista.nombre} ${p.id}`.toLowerCase().includes(searchLower) ||
          formatDateTime(p.fecha).toLowerCase().includes(searchLower);

        return matchesFilter && matchesSearch;
      }),
    [pedidos, filter, search],
  );

  const orderRows = visibleOrders.slice(
    page * rowsPerPage,
    (page + 1) * rowsPerPage,
  );

  return (
    <Card elevation={0} sx={commercialTableCardSx}>
      {/* Toolbar */}
      <Box sx={commercialTableToolbarSx}>
        <Box>
          <Typography variant="h6" sx={commercialTableTitleSx}>
            Pedidos Registrados
          </Typography>
          <Typography variant="body2" sx={commercialTableDescriptionSx}>
            {visibleOrders.length} pedidos encontrados para consultar y gestionar.
          </Typography>
        </Box>

        <Box sx={commercialTableActionsSx}>
          <TextField
            placeholder="Buscar cliente o pedido..."
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

          <FormControl
            size="small"
            sx={{
              ...commercialTableFiltersSx,
              minWidth: 0,
              width: { xs: "100%", sm: 170 },
            }}
          >
            <Select
              value={filter}
              onChange={(e) => {
                onFilterChange(e.target.value);
                setPage(0);
              }}
              sx={{
                minHeight: 40,
                fontWeight: 600,
                bgcolor: "background.paper",
              }}
            >
              <MenuItem value="todos">Todos los estados</MenuItem>
              <MenuItem value="pendiente">Pendientes</MenuItem>
              <MenuItem value="cargado">Listos para entrega</MenuItem>
              <MenuItem value="entregado">Entregados</MenuItem>
              <MenuItem value="entregado_parcial">Entrega parcial</MenuItem>
              <MenuItem value="cancelado">Cancelados</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Mobile Card List View */}
      <Box sx={{ display: { xs: "grid", sm: "none" }, gap: 1, p: 1.5 }}>
        {orderRows.length === 0 ? (
          <Box sx={{ py: 4, textAlign: "center", color: "text.secondary" }}>
            <Typography sx={{ fontWeight: 600 }}>
              {pedidos.length === 0
                ? "Aún no hay pedidos"
                : "No hay pedidos para mostrar"}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {pedidos.length === 0
                ? "Crea un nuevo pedido para empezar."
                : "Cambia el filtro o el término de búsqueda."}
            </Typography>
          </Box>
        ) : (
          orderRows.map((pedido) => {
            const saleAmount = pedido.venta?.detalles.reduce(
              (sum, detail) =>
                sum +
                detail.cantidadVendida * Number(detail.precioAplicado),
              0,
            );
            const state = statusMap[pedido.estado] ?? statusMap.pendiente;
            const totalTrays = pedido.detalles.reduce(
              (sum, d) => sum + d.cantidadSolicitada,
              0,
            );

            return (
              <Box key={pedido.id} sx={commercialTableMobileCardSx}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 1,
                    mb: 0.8,
                  }}
                >
                  <Box>
                    <Typography sx={commercialTableMobilePrimaryTextSx}>
                      Pedido #{pedido.id}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDateTime(pedido.fecha)}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    color={state.color}
                    label={state.label}
                  />
                </Box>

                <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }}>
                  {pedido.mayorista.nombre}
                </Typography>

                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, my: 1 }}>
                  {pedido.detalles.slice(0, 4).map((d) => (
                    <CategoryBadge
                      key={d.codigoCategoriaPeso}
                      codigo={d.codigoCategoriaPeso}
                      nombre={d.categoriaPeso.nombre}
                      cantidad={d.cantidadSolicitada}
                    />
                  ))}
                  {pedido.detalles.length > 4 && (
                    <Chip
                      size="small"
                      label={`+${pedido.detalles.length - 4}`}
                    />
                  )}
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    pt: 1,
                    borderTop: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Bandejas
                    </Typography>
                    <Typography sx={{ fontWeight: 700, fontSize: "0.875rem" }}>
                      {totalTrays.toLocaleString("en-US")}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    <Typography variant="caption" color="text.secondary">
                      Total venta
                    </Typography>
                    <Typography
                      sx={{
                        fontWeight: 800,
                        fontSize: "0.875rem",
                        color: "text.primary",
                      }}
                    >
                      {saleAmount === undefined
                        ? "—"
                        : formatMoney(saleAmount)}
                    </Typography>
                  </Box>
                </Box>

                <Stack
                  direction="row"
                  spacing={1}
                  sx={{
                    mt: 1,
                    pt: 1,
                    borderTop: "1px solid",
                    borderColor: "divider",
                    justifyContent: "flex-end",
                  }}
                >
                  <Button
                    size="small"
                    startIcon={<VisibilityRoundedIcon sx={{ fontSize: 16 }} />}
                    onClick={() => onOpenDetails(pedido)}
                  >
                    Detalle
                  </Button>
                  {pedido.estado === "pendiente" && canOrder && (
                    <Button
                      size="small"
                      aria-label={`Editar pedido ${pedido.id}`}
                      onClick={() => onOpenEdit(pedido)}
                    >
                      <EditRoundedIcon fontSize="small" />
                    </Button>
                  )}
                  {(pedido.estado === "pendiente" ||
                    pedido.estado === "cargado") &&
                    canSell && (
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => onOpenSale(pedido)}
                      >
                        Cargar pedido
                      </Button>
                    )}
                </Stack>
              </Box>
            );
          })
        )}
      </Box>

      {/* Desktop Table View */}
      <TableContainer sx={{ display: { xs: "none", sm: "block" } }}>
        <Table sx={commercialTableSx} aria-label="Tabla de pedidos">
          <TableHead>
            <TableRow>
              <TableCell>PEDIDO / FECHA</TableCell>
              <TableCell>CLIENTE</TableCell>
              <TableCell>PRESENTACIONES</TableCell>
              <TableCell align="center">BANDEJAS</TableCell>
              <TableCell>ESTADO</TableCell>
              <TableCell align="right">TOTAL VENTA</TableCell>
              <TableCell align="center">ACCIONES</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orderRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <Typography sx={{ fontWeight: 700 }}>
                    {pedidos.length === 0
                      ? "Aún no hay pedidos"
                      : "No hay pedidos para mostrar"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {pedidos.length === 0
                      ? "Crea un nuevo pedido para empezar."
                      : "Cambia el filtro o el término de búsqueda."}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              orderRows.map((pedido) => {
                const saleAmount = pedido.venta?.detalles.reduce(
                  (sum, detail) =>
                    sum +
                    detail.cantidadVendida * Number(detail.precioAplicado),
                  0,
                );
                const state = statusMap[pedido.estado] ?? statusMap.pendiente;

                return (
                  <TableRow key={pedido.id} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 800 }}>
                        #{pedido.id}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDateTime(pedido.fecha)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 700 }}>
                        {pedido.mayorista.nombre}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack
                        direction="row"
                        spacing={0.5}
                        sx={{ flexWrap: "wrap", gap: 0.5 }}
                      >
                        {pedido.detalles.slice(0, 4).map((d) => (
                          <CategoryBadge
                            key={d.codigoCategoriaPeso}
                            codigo={d.codigoCategoriaPeso}
                            nombre={d.categoriaPeso.nombre}
                            cantidad={d.cantidadSolicitada}
                          />
                        ))}
                        {pedido.detalles.length > 4 && (
                          <Chip
                            size="small"
                            label={`+${pedido.detalles.length - 4}`}
                          />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800 }}>
                      {pedido.detalles
                        .reduce((sum, d) => sum + d.cantidadSolicitada, 0)
                        .toLocaleString("en-US")}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={state.color}
                        label={state.label}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {saleAmount === undefined ? "—" : formatMoney(saleAmount)}
                    </TableCell>
                    <TableCell align="center">
                      <Stack
                        direction="row"
                        spacing={0.5}
                        sx={{ justifyContent: "center" }}
                      >
                        <Button
                          size="small"
                          startIcon={<VisibilityRoundedIcon />}
                          onClick={() => onOpenDetails(pedido)}
                        >
                          Detalle
                        </Button>
                        {pedido.estado === "pendiente" && canOrder && (
                          <Button
                            size="small"
                            aria-label={`Editar pedido ${pedido.id}`}
                            onClick={() => onOpenEdit(pedido)}
                          >
                            <EditRoundedIcon fontSize="small" />
                          </Button>
                        )}
                        {(pedido.estado === "pendiente" ||
                          pedido.estado === "cargado") &&
                          canSell && (
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => onOpenSale(pedido)}
                            >
                              Cargar pedido
                            </Button>
                          )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        rowsPerPageOptions={[10, 25, 50]}
        count={visibleOrders.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(_, value) => setPage(value)}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(Number(e.target.value));
          setPage(0);
        }}
        labelRowsPerPage="Filas por página:"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} de ${count}`
        }
        sx={commercialTablePaginationSx}
      />
    </Card>
  );
}

