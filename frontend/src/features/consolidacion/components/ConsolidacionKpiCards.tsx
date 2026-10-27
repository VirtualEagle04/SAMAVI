import type { ReactElement } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import PaidRoundedIcon from "@mui/icons-material/PaidRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import { pluralize } from "../../../utils/plural";
import type { SemanaConsolidada } from "../types/consolidacion.types";
import { formatMoney } from "./consolidacion.utils";

type Kpi = {
  label: string;
  value: number;
  caption: string;
  icon: ReactElement;
  iconBg: string;
  iconColor: string;
  valueColor: string;
};

/** Totales de la semana: ingresos, egresos, resultado, reparto y deuda. */
export default function ConsolidacionKpiCards({ data }: { data: SemanaConsolidada }) {
  const { totales } = data;
  const bandejas = data.galpones.reduce(
    (suma, galpon) => suma + galpon.ventas.reduce((subtotal, linea) => subtotal + linea.bandejas, 0),
    0,
  );
  const conPerdida = data.galpones.filter((galpon) => galpon.resultado < 0).length;

  const kpis: Kpi[] = [
    {
      label: "INGRESOS",
      value: totales.ingresos,
      caption: `${pluralize(bandejas, "bandeja vendida", "bandejas vendidas")}`,
      icon: <PaidRoundedIcon sx={{ fontSize: 18 }} />,
      iconBg: "rgba(107, 142, 98, 0.12)",
      iconColor: "success.main",
      valueColor: "success.main",
    },
    {
      label: "INSUMOS",
      value: totales.insumos,
      caption: "Consumo entregado a los galpones",
      icon: <Inventory2RoundedIcon sx={{ fontSize: 18 }} />,
      iconBg: "info.light",
      iconColor: "info.main",
      valueColor: "text.primary",
    },
    {
      label: "GASTOS",
      value: totales.gastos,
      caption: pluralize(data.gastos.length, "gasto registrado", "gastos registrados"),
      icon: <ReceiptLongRoundedIcon sx={{ fontSize: 18 }} />,
      iconBg: "warning.light",
      iconColor: "warning.dark",
      valueColor: "text.primary",
    },
    {
      label: "RESULTADO",
      value: totales.resultado,
      caption: "Ingresos menos insumos y gastos",
      icon: <TrendingUpRoundedIcon sx={{ fontSize: 18 }} />,
      iconBg: "rgba(92, 67, 51, 0.1)",
      iconColor: "primary.main",
      valueColor: totales.resultado < 0 ? "error.main" : "text.primary",
    },
    {
      label: "A REPARTIR",
      value: totales.repartido,
      caption: `Entre ${pluralize(data.socios.length, "socio")}`,
      icon: <GroupsRoundedIcon sx={{ fontSize: 18 }} />,
      iconBg: "rgba(200, 122, 87, 0.12)",
      iconColor: "secondary.main",
      valueColor: "text.primary",
    },
    {
      label: "DEUDA DE GALPONES",
      value: totales.deudaFinal,
      caption: conPerdida > 0
        ? `${pluralize(conPerdida, "galpón", "galpones")} con pérdida esta semana`
        : "Ningún galpón con pérdida",
      icon: <AccountBalanceRoundedIcon sx={{ fontSize: 18 }} />,
      iconBg: "rgba(192, 92, 86, 0.1)",
      iconColor: "error.main",
      valueColor: totales.deudaFinal > 0 ? "error.main" : "text.primary",
    },
  ];

  return (
    <Grid container spacing={2}>
      {kpis.map((kpi) => (
        <Grid key={kpi.label} size={{ xs: 6, md: 4, xl: 2 }}>
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
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 1.2 }}>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 700, color: "text.secondary", fontSize: { xs: "0.7rem", sm: "0.8rem" } }}
                >
                  {kpi.label}
                </Typography>
                <Box sx={{ p: 0.8, borderRadius: 1, bgcolor: kpi.iconBg, color: kpi.iconColor, display: "flex" }}>
                  {kpi.icon}
                </Box>
              </Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 800,
                  color: kpi.valueColor,
                  lineHeight: 1.1,
                  fontSize: { xs: "1.05rem", sm: "1.35rem" },
                  overflowWrap: "anywhere",
                }}
              >
                {formatMoney(kpi.value)}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: "text.secondary", fontWeight: 600, mt: 0.8, display: "block" }}
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
