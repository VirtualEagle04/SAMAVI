import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import InputAdornment from "@mui/material/InputAdornment";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import PaidOutlinedIcon from "@mui/icons-material/PaidOutlined";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import type { Mayorista, Pedido } from "../types/comercial.types";
import {
  commercialTableActionsSx,
  commercialTableCardSx,
  commercialTableDescriptionSx,
  commercialTableMobileCardSx,
  commercialTableMobilePrimaryTextSx,
  commercialTablePaginationSx,
  commercialTableSx,
  commercialTableTitleSx,
  commercialTableToolbarSx,
} from "./commercialTableStyles";

interface ClientesTableProps {
  mayoristas: Mayorista[];
  pedidos: Pedido[];
  canEditPrices: boolean;
  onOpenPrices: (cliente: Mayorista) => void;
  priceCounts: Record<number, number>;
}

export default function ClientesTable({
  mayoristas,
  pedidos,
  canEditPrices,
  onOpenPrices,
  priceCounts,
}: ClientesTableProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const filteredClients = useMemo(() => {
    const searchLower = search.toLowerCase().trim();
    if (!searchLower) return mayoristas;

    return mayoristas.filter((client) => {
      const contactStr =
        typeof client.contacto?.telefono === "string"
          ? client.contacto.telefono
          : "";
      return (
        client.nombre.toLowerCase().includes(searchLower) ||
        (client.ubicacion && client.ubicacion.toLowerCase().includes(searchLower)) ||
        contactStr.toLowerCase().includes(searchLower)
      );
    });
  }, [mayoristas, search]);

  const clientRows = filteredClients.slice(
    page * rowsPerPage,
    (page + 1) * rowsPerPage,
  );

  return (
    <Card elevation={0} sx={commercialTableCardSx}>
      {/* Toolbar */}
      <Box sx={commercialTableToolbarSx}>
        <Box>
          <Typography variant="h6" sx={commercialTableTitleSx}>
            Clientes Mayoristas
          </Typography>
          <Typography variant="body2" sx={commercialTableDescriptionSx}>
            {filteredClients.length} clientes registrados en el sistema.
          </Typography>
        </Box>

        <Box sx={commercialTableActionsSx}>
          <TextField
            placeholder="Buscar por cliente, ubicación o teléfono..."
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
              width: { xs: "100%", sm: 280 },
              "& .MuiInputBase-root": {
                minHeight: 40,
                bgcolor: "background.paper",
                fontSize: "0.875rem",
              },
            }}
          />
        </Box>
      </Box>

      {/* Mobile Card List View */}
      <Box sx={{ display: { xs: "grid", sm: "none" }, gap: 1, p: 1.5 }}>
        {clientRows.length === 0 ? (
          <Box sx={{ py: 4, textAlign: "center", color: "text.secondary" }}>
            <Typography sx={{ fontWeight: 600 }}>
              {mayoristas.length === 0
                ? "No hay clientes registrados"
                : "No se encontraron clientes"}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {mayoristas.length === 0
                ? "Registra nuevos clientes mayoristas desde la creación de pedidos."
                : "Verifica el término de búsqueda."}
            </Typography>
          </Box>
        ) : (
          clientRows.map((client) => {
            const contact = client.contacto?.telefono;
            const clientOrdersCount = pedidos.filter(
              (p) => p.idMayorista === client.id,
            ).length;

            return (
              <Box key={client.id} sx={commercialTableMobileCardSx}>
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
                      {client.nombre}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {client.ubicacion || "Sin ubicación registrada"}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`${clientOrdersCount} pedidos`}
                  />
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    my: 1,
                    pt: 1,
                    borderTop: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Contacto
                    </Typography>
                    <Typography sx={{ fontWeight: 600, fontSize: "0.85rem" }}>
                      {typeof contact === "string" ? contact : "—"}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    <Typography variant="caption" color="text.secondary">
                      Precios
                    </Typography>
                    <Typography sx={{ fontWeight: 600, fontSize: "0.85rem" }}>
                      {priceCounts[client.id] !== undefined
                        ? `${priceCounts[client.id]} categorias`
                        : "Sin consultar"}
                    </Typography>
                  </Box>
                </Box>

                {canEditPrices && (
                  <Button
                    size="small"
                    variant="outlined"
                    fullWidth
                    startIcon={<PaidOutlinedIcon sx={{ fontSize: 16 }} />}
                    onClick={() => onOpenPrices(client)}
                    sx={{ mt: 0.5 }}
                  >
                    Ver y editar precios
                  </Button>
                )}
              </Box>
            );
          })
        )}
      </Box>

      {/* Desktop Table View */}
      <TableContainer sx={{ display: { xs: "none", sm: "block" } }}>
        <Table sx={commercialTableSx} aria-label="Tabla de clientes mayoristas">
          <TableHead>
            <TableRow>
              <TableCell>CLIENTE</TableCell>
              <TableCell>UBICACIÓN</TableCell>
              <TableCell>CONTACTO</TableCell>
              <TableCell align="center">PEDIDOS</TableCell>
              <TableCell align="center">PRECIOS</TableCell>
              <TableCell align="center">ACCIONES</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {clientRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                  <Typography sx={{ fontWeight: 700 }}>
                    {mayoristas.length === 0
                      ? "No hay clientes registrados"
                      : "No se encontraron clientes"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {mayoristas.length === 0
                      ? "Registra nuevos clientes mayoristas desde la creación de pedidos."
                      : "Verifica el término de búsqueda."}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              clientRows.map((client) => {
                const contact = client.contacto?.telefono;
                const clientOrdersCount = pedidos.filter(
                  (p) => p.idMayorista === client.id,
                ).length;

                return (
                  <TableRow key={client.id} hover>
                    <TableCell sx={{ fontWeight: 700 }}>
                      {client.nombre}
                    </TableCell>
                    <TableCell>{client.ubicacion || "—"}</TableCell>
                    <TableCell>
                      {typeof contact === "string" ? contact : "—"}
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>
                      {clientOrdersCount}{" "}
                      <Typography
                        component="span"
                        variant="caption"
                        color="text.secondary"
                      >
                        pedidos
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {priceCounts[client.id] !== undefined
                        ? `${priceCounts[client.id]} categorias`
                        : "Sin consultar"}
                    </TableCell>
                    <TableCell align="center">
                      {canEditPrices && (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<PaidOutlinedIcon sx={{ fontSize: 16 }} />}
                          onClick={() => onOpenPrices(client)}
                        >
                          Ver y editar precios
                        </Button>
                      )}
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
        count={filteredClients.length}
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

