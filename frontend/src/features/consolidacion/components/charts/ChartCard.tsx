import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import TableToolbar from "../../../../components/molecules/TableToolbar";
import { tableCardSx } from "../../../../components/tableStyles";

type ChartCardProps = {
  title: string;
  description: string;
  actions?: ReactNode;
  /** Resumen en texto de la gráfica para lectores de pantalla. */
  ariaLabel: string;
  children: ReactNode;
};

/** Tarjeta de gráfica con el mismo encabezado que las tablas. */
export default function ChartCard({ title, description, actions, ariaLabel, children }: ChartCardProps) {
  return (
    <Card elevation={0} variant="outlined" sx={{ ...tableCardSx, height: "100%" }}>
      <TableToolbar title={title} description={description} actions={actions} />
      <Box role="img" aria-label={ariaLabel} sx={{ p: { xs: 1.5, sm: 2 } }}>
        {children}
      </Box>
    </Card>
  );
}

/** Muestra de color con su etiqueta para las leyendas. */
export function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
      <Box sx={{ width: 10, height: 10, borderRadius: "3px", bgcolor: color, flexShrink: 0 }} />
      <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
        {label}
      </Typography>
    </Box>
  );
}
