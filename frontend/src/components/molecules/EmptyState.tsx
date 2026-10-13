import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  description: string;
};

/**
 * Estado vacío estándar de tablas y listas: reemplaza todo el cuerpo de la
 * tabla (sin cabeceras ni paginación) y se muestra en móvil y escritorio.
 */
export default function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <Box sx={{ py: 6, textAlign: "center", color: "text.secondary" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          color: "text.disabled",
          "& svg": { fontSize: 40 },
        }}
      >
        {icon}
      </Box>
      <Typography sx={{ fontWeight: 700, mt: 1 }}>{title}</Typography>
      <Typography variant="body2">{description}</Typography>
    </Box>
  );
}
