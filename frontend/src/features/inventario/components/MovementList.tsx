import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { Movimiento } from "../types/inventario.types";
import { amount, dateTime } from "../utils/inventarioFormat";
import {
  tableMobileCardSx,
  tableMobilePrimaryTextSx,
} from "../../../components/tableStyles";

export default function MovementList({
  movements,
}: {
  movements: Movimiento[];
}) {
  if (!movements.length)
    return (
      <Box sx={{ py: 4, textAlign: "center", color: "text.secondary" }}>
        <Typography sx={{ fontWeight: 600 }}>
          No hay movimientos registrados
        </Typography>
      </Box>
    );

  return (
    <Stack spacing={1}>
      {movements.map((item) => {
        const input = item.tipoMovimiento.efecto === "entrada";
        return (
          <Box
            key={String(item.id)}
            sx={{
              ...tableMobileCardSx,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 1,
              borderLeft: "4px solid",
              borderLeftColor: input ? "success.main" : "warning.main",
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={tableMobilePrimaryTextSx}>
                {item.tipoMovimiento.nombre}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {dateTime(item.fecha)} ·{" "}
                {item.idCompra
                  ? `Compra #${item.idCompra}`
                  : item.idGalpon
                    ? `Galpón ${item.idGalpon}`
                    : "Bodega"}
              </Typography>
            </Box>
            <Typography
              sx={{
                fontWeight: 700,
                color: input ? "success.dark" : "warning.dark",
                whiteSpace: "nowrap",
              }}
            >
              {input ? "+" : "-"}
              {amount(item.cantidad)}
            </Typography>
          </Box>
        );
      })}
    </Stack>
  );
}
