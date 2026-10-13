import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import type { StockInsumo } from "../types/inventario.types";
import { amount, money } from "../utils/inventarioFormat";
import { pluralize } from "../../../utils/plural";
import EmptyState from "../../../components/molecules/EmptyState";
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

const NO_FILTER_KEYS = [] as const;

const inactiveFilterField: FilterField = {
  key: "inactivos",
  type: "switch",
  label: "Incluir insumos inactivos",
  activeLabel: "Incluye inactivos",
};

type StockTableProps = {
  items: StockInsumo[];
  totalCount: number;
  search: string;
  activeOnly: boolean;
  onSearchChange: (value: string) => void;
  onActiveOnlyChange: (value: boolean) => void;
  onNew: () => void;
  onEdit: (item: StockInsumo) => void;
  onKardex: (item: StockInsumo) => void;
  onToggle: (item: StockInsumo) => Promise<void>;
  onDelete: (item: StockInsumo) => Promise<void>;
};

// Área táctil mayor en móvil; en escritorio se conserva el tamaño compacto.
const touchTargetSx = { p: { xs: 1.25, sm: 0.625 } };

const isLow = (item: StockInsumo) =>
  Number(item.stock) <= Number(item.stockMinimo);

function StatusChip({ item }: { item: StockInsumo }) {
  if (!item.activo) return <Chip size="small" label="Inactivo" />;
  const low = isLow(item);
  return (
    <Chip
      size="small"
      label={low ? "Bajo" : "Normal"}
      color={low ? "warning" : "success"}
    />
  );
}

function RowActions({
  item,
  onEdit,
  onKardex,
  onToggle,
  onDelete,
}: {
  item: StockInsumo;
  onEdit: (item: StockInsumo) => void;
  onKardex: (item: StockInsumo) => void;
  onToggle: (item: StockInsumo) => Promise<void>;
  onDelete: (item: StockInsumo) => Promise<void>;
}) {
  return (
    <Stack
      direction="row"
      sx={{ justifyContent: "center", alignItems: "center", gap: { xs: 0.5, sm: 0 } }}
    >
      <IconButton
        aria-label="Ver kardex"
        title="Ver kardex"
        size="small"
        sx={touchTargetSx}
        onClick={() => onKardex(item)}
      >
        <VisibilityRoundedIcon fontSize="small" />
      </IconButton>
      <Switch
        checked={item.activo}
        onChange={() => void onToggle(item)}
        slotProps={{
          input: {
            "aria-label": `${item.activo ? "Desactivar" : "Activar"} ${item.nombre}`,
          },
        }}
        size="small"
      />
      <IconButton
        aria-label="Editar insumo"
        title="Editar"
        size="small"
        sx={touchTargetSx}
        onClick={() => onEdit(item)}
      >
        <EditRoundedIcon fontSize="small" />
      </IconButton>
      <IconButton
        aria-label="Eliminar insumo permanentemente"
        title="Eliminar permanentemente"
        size="small"
        sx={{ ...touchTargetSx, ml: { xs: 1, sm: 0 } }}
        onClick={() => void onDelete(item)}
      >
        <DeleteOutlineRoundedIcon fontSize="small" />
      </IconButton>
    </Stack>
  );
}

export default function StockTable({
  items,
  totalCount,
  search,
  activeOnly,
  onSearchChange,
  onActiveOnlyChange,
  onNew,
  onEdit,
  onKardex,
  onToggle,
  onDelete,
}: StockTableProps) {
  // Búsqueda y filtro de activos viven en InventarioPage; aquí solo la paginación.
  const tableState = useTableFilters(NO_FILTER_KEYS);
  const { rows, page: safePage } = tableState.paginate(items);
  const emptyTitle =
    totalCount === 0 ? "Aún no hay insumos" : "No hay insumos para mostrar";
  const emptyText =
    totalCount === 0
      ? "Crea un nuevo insumo para empezar."
      : "Cambia el filtro o el término de búsqueda.";
  const actions = { onEdit, onKardex, onToggle, onDelete };

  return (
    <Card elevation={0} sx={tableCardSx}>
      <TableToolbar
        title="Existencias"
        description={`${pluralize(items.length, "insumo encontrado", "insumos encontrados")} · stock calculado desde el kardex.`}
        search={{
          value: search,
          onChange: (value) => {
            onSearchChange(value);
            tableState.setPage(0);
          },
          placeholder: "Buscar por código o nombre...",
        }}
        filters={{
          fields: [inactiveFilterField],
          values: { inactivos: activeOnly ? "" : "1" },
          activeCount: activeOnly ? 0 : 1,
          onChange: (_key, value) => {
            onActiveOnlyChange(value === "");
            tableState.setPage(0);
          },
          onReset: () => {
            onActiveOnlyChange(true);
            tableState.setPage(0);
          },
        }}
        actions={
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={onNew}
            sx={{ whiteSpace: "nowrap" }}
          >
            Nuevo insumo
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Inventory2RoundedIcon />}
          title={emptyTitle}
          description={emptyText}
        />
      ) : (
        <>
        <Box sx={{ display: { xs: "grid", sm: "none" }, gap: 1, p: 1.5 }}>
          {rows.map((item) => (
              <Box key={item.id} sx={tableMobileCardSx}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 1,
                    mb: 0.8,
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={tableMobilePrimaryTextSx}>
                      {item.nombre}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.codigo} · {item.unidadMedida}
                    </Typography>
                  </Box>
                  <StatusChip item={item} />
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 1,
                    pt: 1,
                    borderTop: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Stock
                    </Typography>
                    <Typography
                      sx={{
                        ...tableMobilePrimaryTextSx,
                        color:
                          item.activo && isLow(item)
                            ? "warning.dark"
                            : "text.primary",
                      }}
                    >
                      {amount(item.stock)}{" "}
                      <Typography
                        component="span"
                        variant="caption"
                        color="text.secondary"
                      >
                        mín. {amount(item.stockMinimo)}
                      </Typography>
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    <Typography variant="caption" color="text.secondary">
                      Costo
                    </Typography>
                    <Typography sx={tableMobilePrimaryTextSx}>
                      {money(item.costo)}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ mt: 1 }}>
                  <RowActions item={item} {...actions} />
                </Box>
              </Box>
          ))}
        </Box>

        <TableContainer sx={{ display: { xs: "none", sm: "block" } }}>
          <Table sx={tableSx} aria-label="Tabla de existencias">
            <TableHead>
              <TableRow>
                <TableCell>INSUMO</TableCell>
                <TableCell align="right">STOCK</TableCell>
                <TableCell align="right">COSTO</TableCell>
                <TableCell>ESTADO</TableCell>
                <TableCell align="center">ACCIONES</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell sx={{ minWidth: 150 }}>
                      <Typography sx={{ fontWeight: 700 }}>
                        {item.nombre}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.codigo} · {item.unidadMedida}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        sx={{
                          fontWeight: 700,
                          color:
                            item.activo && isLow(item)
                              ? "warning.dark"
                              : "text.primary",
                        }}
                      >
                        {amount(item.stock)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        mín. {amount(item.stockMinimo)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      {money(item.costo)}
                    </TableCell>
                    <TableCell>
                      <StatusChip item={item} />
                    </TableCell>
                    <TableCell align="center">
                      <RowActions item={item} {...actions} />
                    </TableCell>
                  </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={items.length}
          page={safePage}
          onPageChange={(_event, value) => tableState.setPage(value)}
          rowsPerPage={tableState.rowsPerPage}
          onRowsPerPageChange={(event) => {
            tableState.setRowsPerPage(Number(event.target.value));
          }}
          rowsPerPageOptions={[10, 25, 50]}
          {...tablePaginationLabels}
          sx={tablePaginationSx}
        />
        </>
      )}
    </Card>
  );
}
