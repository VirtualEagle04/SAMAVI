import type { ReactNode } from "react";
import ArchiveRoundedIcon from "@mui/icons-material/ArchiveRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import FactCheckRoundedIcon from "@mui/icons-material/FactCheckRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { pluralize } from "../../../utils/plural";
import type { StockInsumo } from "../types/inventario.types";
import { amount, money } from "../utils/inventarioFormat";

type Kpi = {
  label: string;
  value: string;
  caption: string;
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  valueColor: string;
};

export default function InventarioKpiCards({
  stock,
  critical,
  totalValue,
}: {
  stock: StockInsumo[];
  critical: StockInsumo[];
  totalValue: number;
}) {
  const kpis: Kpi[] = [
    {
      label: "INSUMOS ACTIVOS",
      value: stock.filter((item) => item.activo).length.toLocaleString("es-CO"),
      caption: pluralize(stock.length, "registrado", "registrados"),
      icon: <Inventory2RoundedIcon sx={{ fontSize: 18 }} />,
      iconBg: "rgba(107, 142, 98, 0.12)",
      iconColor: "success.main",
      valueColor: "text.primary",
    },
    {
      label: "STOCK CRÍTICO",
      value: critical.length.toLocaleString("es-CO"),
      caption: "Insumos en o por debajo del mínimo",
      icon: <ErrorOutlineRoundedIcon sx={{ fontSize: 18 }} />,
      iconBg: "warning.light",
      iconColor: "warning.dark",
      valueColor: critical.length > 0 ? "warning.dark" : "text.primary",
    },
    {
      label: "VALOR EN BODEGA",
      value: money(totalValue),
      caption: "Valorizado a costo promedio",
      icon: <ArchiveRoundedIcon sx={{ fontSize: 18 }} />,
      iconBg: "info.light",
      iconColor: "info.main",
      valueColor: "text.primary",
    },
    {
      label: "UNIDADES CONTROLADAS",
      value: amount(stock.reduce((sum, item) => sum + Number(item.stock), 0)),
      caption: "Existencia total en bodega",
      icon: <FactCheckRoundedIcon sx={{ fontSize: 18 }} />,
      iconBg: "rgba(92, 67, 51, 0.08)",
      iconColor: "primary.main",
      valueColor: "text.primary",
    },
  ];

  return (
    <Grid container spacing={2}>
      {kpis.map((kpi) => (
        <Grid key={kpi.label} size={{ xs: 6, md: 3 }}>
          <Card
            elevation={0}
            sx={{
              height: "100%",
              border: "1px solid",
              borderColor: "divider",
              backgroundColor: "background.paper",
              p: 0.5,
            }}
          >
            <CardContent sx={{ p: { xs: 1.5, sm: 2 }, "&:last-child": { pb: { xs: 1.5, sm: 2 } } }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 1.2,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    color: "text.secondary",
                    fontSize: { xs: "0.7rem", sm: "0.8rem" },
                  }}
                >
                  {kpi.label}
                </Typography>
                <Box
                  sx={{
                    p: 0.8,
                    borderRadius: 1,
                    bgcolor: kpi.iconBg,
                    color: kpi.iconColor,
                    display: "flex",
                  }}
                >
                  {kpi.icon}
                </Box>
              </Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: kpi.valueColor,
                  lineHeight: 1.1,
                  fontSize: { xs: "1.15rem", sm: "1.5rem", md: "1.35rem", lg: "1.5rem" },
                  overflowWrap: "anywhere",
                }}
              >
                {kpi.value}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  fontWeight: 600,
                  mt: 0.8,
                  display: "block",
                }}
              >
                {kpi.caption}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
