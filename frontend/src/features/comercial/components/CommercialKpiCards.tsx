import { useMemo } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import PaidRoundedIcon from "@mui/icons-material/PaidRounded";
import PendingActionsRoundedIcon from "@mui/icons-material/PendingActionsRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import ShoppingBagRoundedIcon from "@mui/icons-material/ShoppingBagRounded";
import type { Mayorista, Pedido } from "../types/comercial.types";

export interface CommercialKpiCardsProps {
  pedidos: Pedido[];
  mayoristas: Mayorista[];
  onSelectFilter?: (status: string) => void;
}

const formatMoney = (value: number) =>
  `$${Math.round(value).toLocaleString("en-US")} COP`;

export default function CommercialKpiCards({
  pedidos,
  mayoristas,
  onSelectFilter,
}: CommercialKpiCardsProps) {
  const counts = useMemo(
    () => ({
      pending: pedidos.filter((p) => p.estado === "pendiente").length,
      ready: pedidos.filter((p) => p.estado === "cargado").length,
      delivered: pedidos.filter(
        (p) => p.estado === "entregado" || p.estado === "entregado_parcial",
      ).length,
    }),
    [pedidos],
  );

  const deliveredSales = useMemo(
    () =>
      pedidos.filter(
        (p) =>
          (p.estado === "entregado" || p.estado === "entregado_parcial") &&
          p.venta,
      ),
    [pedidos],
  );

  const salesTotal = useMemo(
    () =>
      deliveredSales.reduce(
        (sum, p) =>
          sum +
          (p.venta?.detalles.reduce(
            (subtotal, d) =>
              subtotal + d.cantidadVendida * Number(d.precioAplicado),
            0,
          ) ?? 0),
        0,
      ),
    [deliveredSales],
  );

  const soldTrays = useMemo(
    () =>
      deliveredSales.reduce(
        (sum, p) =>
          sum +
          (p.venta?.detalles.reduce(
            (subtotal, d) => subtotal + d.cantidadVendida,
            0,
          ) ?? 0),
        0,
      ),
    [deliveredSales],
  );

  const averageSale = useMemo(
    () => (deliveredSales.length > 0 ? salesTotal / deliveredSales.length : 0),
    [deliveredSales.length, salesTotal],
  );

  const kpis = [
    {
      label: "VENTAS REGISTRADAS",
      value: formatMoney(salesTotal),
      unit: undefined,
      caption: `${deliveredSales.length} pedidos entregados`,
      icon: <PaidRoundedIcon sx={{ fontSize: 18 }} />,
      iconBg: "rgba(107, 142, 98, 0.12)",
      iconColor: "success.main",
      valueColor: "success.main",
      state: undefined,
    },
    {
      label: "BANDEJAS VENDIDAS",
      value: soldTrays.toLocaleString("en-US"),
      unit: "bandejas",
      caption: "Total despachado en ventas",
      icon: <Inventory2RoundedIcon sx={{ fontSize: 18 }} />,
      iconBg: "rgba(33, 150, 243, 0.12)",
      iconColor: "info.main",
      valueColor: "text.primary",
      state: undefined,
    },
    {
      label: "PROMEDIO POR VENTA",
      value: formatMoney(averageSale),
      unit: undefined,
      caption: "Valor promedio por pedido entregado",
      icon: <ShoppingBagRoundedIcon sx={{ fontSize: 18 }} />,
      iconBg: "rgba(107, 142, 98, 0.12)",
      iconColor: "primary.main",
      valueColor: "text.primary",
      state: undefined,
    },
    {
      label: "POR PREPARAR",
      value: counts.pending.toLocaleString("en-US"),
      unit: "pedidos",
      caption: "Pedidos recibidos en espera de carga",
      icon: <PendingActionsRoundedIcon sx={{ fontSize: 18 }} />,
      iconBg: "warning.light",
      iconColor: "warning.dark",
      valueColor: counts.pending > 0 ? "warning.dark" : "text.primary",
      state: "pendiente",
    },
    {
      label: "LISTOS PARA ENTREGA",
      value: counts.ready.toLocaleString("en-US"),
      unit: "pedidos",
      caption: "Pendientes de registrar venta",
      icon: <LocalShippingRoundedIcon sx={{ fontSize: 18 }} />,
      iconBg: "rgba(33, 150, 243, 0.12)",
      iconColor: "info.main",
      valueColor: counts.ready > 0 ? "info.main" : "text.primary",
      state: "cargado",
    },
    {
      label: "CLIENTES MAYORISTAS",
      value: mayoristas.length.toLocaleString("en-US"),
      unit: "clientes",
      caption: `${counts.delivered} pedidos entregados a la fecha`,
      icon: <PeopleAltRoundedIcon sx={{ fontSize: 18 }} />,
      iconBg: "rgba(156, 39, 176, 0.12)",
      iconColor: "secondary.main",
      valueColor: "text.primary",
      state: undefined,
    },
  ];

  return (
    <Grid container spacing={2}>
      {kpis.map((kpi) => {
        const isClickable = Boolean(kpi.state && onSelectFilter);

        return (
          <Grid key={kpi.label} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card
              elevation={0}
              onClick={
                isClickable ? () => onSelectFilter?.(kpi.state!) : undefined
              }
              sx={{
                height: "100%",
                border: "1px solid",
                borderColor: "divider",
                backgroundColor: "background.paper",
                p: 0.5,
                cursor: isClickable ? "pointer" : "default",
                transition: isClickable
                  ? "border-color 0.2s ease, transform 0.15s ease"
                  : undefined,
                ...(isClickable
                  ? {
                      "&:hover": {
                        borderColor: "primary.main",
                      },
                    }
                  : {}),
              }}
            >
              <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
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
                      fontSize: "0.8rem",
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
                    fontWeight: 800,
                    color: kpi.valueColor,
                    lineHeight: 1.1,
                  }}
                >
                  {kpi.value}{" "}
                  {kpi.unit && (
                    <Typography
                      component="span"
                      variant="body2"
                      sx={{ fontWeight: 600, color: "text.secondary" }}
                    >
                      {kpi.unit}
                    </Typography>
                  )}
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
        );
      })}
    </Grid>
  );
}

