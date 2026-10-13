import SwapVertRoundedIcon from "@mui/icons-material/SwapVertRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import EmptyState from "../../../components/molecules/EmptyState";
import type { Movimiento, StockInsumo } from "../types/inventario.types";
import { amount } from "../utils/inventarioFormat";
import MovementList from "./MovementList";
import EntitySelect from "../../../components/molecules/EntitySelect";
import TableToolbar from "../../../components/molecules/TableToolbar";
import { tableCardSx } from "../../../components/tableStyles";

export default function MovimientosView({
  stock,
  movements,
  selected,
  onSelect,
  onNew,
}: {
  stock: StockInsumo[];
  movements: Movimiento[];
  selected: StockInsumo | null;
  onSelect: (item: StockInsumo) => void;
  onNew: () => void;
}) {
  const activeStock = stock.filter((item) => item.activo);

  return (
    <Card elevation={0} sx={tableCardSx}>
      <TableToolbar
        title="Kardex"
        description="Consulta entradas, salidas y ajustes por insumo."
        actions={
          <>
            <EntitySelect
              value={selected?.id ?? null}
              placeholder="Selecciona un insumo"
              ariaLabel="Insumo del kardex"
              options={activeStock.map((item) => ({
                value: item.id,
                label: item.nombre,
                detail: `${item.nombre} · ${item.codigo} · stock: ${amount(item.stock)} ${item.unidadMedida}`,
              }))}
              onChange={(id) => {
                const item = activeStock.find((candidate) => candidate.id === id);
                if (item) onSelect(item);
              }}
            />
            <Button
              variant="contained"
              startIcon={<SwapVertRoundedIcon />}
              onClick={onNew}
              sx={{ whiteSpace: "nowrap" }}
            >
              Nuevo movimiento
            </Button>
          </>
        }
      />

      {selected ? (
        <Box sx={{ p: 2 }}>
          <Box sx={{ mb: 1.5 }}>
            <Typography sx={{ fontWeight: 700 }}>{selected.nombre}</Typography>
            <Typography variant="body2" color="text.secondary">
              {selected.codigo} · {amount(selected.stock)}{" "}
              {selected.unidadMedida} disponibles
            </Typography>
          </Box>
          <MovementList movements={movements} />
        </Box>
      ) : (
        <EmptyState
          icon={<SwapVertRoundedIcon />}
          title="Selecciona un insumo"
          description="El historial aparecerá aquí."
        />
      )}
    </Card>
  );
}
