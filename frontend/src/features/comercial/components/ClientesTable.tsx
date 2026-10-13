import { useMemo } from "react";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import { pluralize, pluralWord } from "../../../utils/plural";
import EmptyState from "../../../components/molecules/EmptyState";
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
import PaidOutlinedIcon from "@mui/icons-material/PaidOutlined";
import type { Mayorista, Pedido } from "../types/comercial.types";
import TableToolbar from "../../../components/molecules/TableToolbar";
import { useTableFilters } from "../../../hooks/useTableFilters";
import {
  tableCardSx,
  tableMobileCardSx,
  tableMobilePrimaryTextSx,
  tablePaginationLabels,
  tablePaginationSx,
  tableSx,
} from "../../../components/tableStyles";

const NO_FILTER_KEYS = [] as const;

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
  const tableState = useTableFilters(NO_FILTER_KEYS);
  const { search } = tableState;

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

  const { rows: clientRows, page } = tableState.paginate(filteredClients);

  return (
    <Card elevation={0} sx={tableCardSx}>
      <TableToolbar
        title="Clientes Mayoristas"
        description={`${pluralize(filteredClients.length, "cliente registrado", "clientes registrados")} en el sistema.`}
        search={{
          value: search,
          onChange: tableState.setSearch,
          placeholder: "Buscar por cliente, ubicación o teléfono...",
        }}
      />

      {clientRows.length === 0 ? (
        <EmptyState
          icon={<PeopleAltOutlinedIcon />}
          title={mayoristas.length === 0 ? "No hay clientes registrados" : "No se encontraron clientes"}
          description={mayoristas.length === 0 ? "Registra nuevos clientes mayoristas desde la creación de pedidos." : "Verifica el término de búsqueda."}
        />
      ) : (
        <>
        {/* Mobile Card List View */}
        <Box sx={{ display: { xs: "grid", sm: "none" }, gap: 1, p: 1.5 }}>
          {clientRows.map((client) => {
            const contact = client.contacto?.telefono;
            const clientOrdersCount = pedidos.filter(
              (p) => p.idMayorista === client.id,
            ).length;

            return (
              <Box key={client.id} sx={tableMobileCardSx}>
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
                    <Typography sx={tableMobilePrimaryTextSx}>
                      {client.nombre}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {client.ubicacion || "Sin ubicación registrada"}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={pluralize(clientOrdersCount, "pedido")}
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
                        ? pluralize(priceCounts[client.id], "categoría", "categorías")
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
          })}
        </Box>

        {/* Desktop Table View */}
        <TableContainer sx={{ display: { xs: "none", sm: "block" } }}>
          <Table sx={tableSx} aria-label="Tabla de clientes mayoristas">
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
              {clientRows.map((client) => {
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
                        {pluralWord(clientOrdersCount, "pedido")}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {priceCounts[client.id] !== undefined
                        ? pluralize(priceCounts[client.id], "categoría", "categorías")
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
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          rowsPerPageOptions={[10, 25, 50]}
          count={filteredClients.length}
          rowsPerPage={tableState.rowsPerPage}
          page={page}
          onPageChange={(_, value) => tableState.setPage(value)}
          onRowsPerPageChange={(e) => {
            tableState.setRowsPerPage(Number(e.target.value));
          }}
          {...tablePaginationLabels}
          sx={tablePaginationSx}
        />
        </>
      )}
    </Card>
  );
}

