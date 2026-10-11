import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import CategoryBadge from "../../../components/atoms/CategoryBadge";
import { getPreciosMayorista } from "../services/comercialService";
import type {
  CategoriaComercial,
  Mayorista,
  PrecioMayorista,
} from "../types/comercial.types";
import {
  commercialTableActionsSx,
  commercialTableCardSx,
  commercialTableDescriptionSx,
  commercialTableFiltersSx,
  commercialTableMobileCardSx,
  commercialTableSx,
  commercialTableTitleSx,
  commercialTableToolbarSx,
} from "./commercialTableStyles";

interface PreciosTableProps {
  mayoristas: Mayorista[];
  categorias: CategoriaComercial[];
  canEditPrices: boolean;
  onOpenPrices: (cliente: Mayorista) => void;
  refreshKey?: number;
}

const formatMoney = (value: number) =>
  `$${Math.round(value).toLocaleString("en-US")} COP`;

const formatWeightRange = (cat: CategoriaComercial) => {
  if (cat.pesoMinG !== null && cat.pesoMaxG !== null) {
    return `${cat.pesoMinG}g – ${cat.pesoMaxG}g`;
  }
  if (cat.pesoMinG !== null) {
    return `≥ ${cat.pesoMinG}g`;
  }
  if (cat.pesoMaxG !== null) {
    return `≤ ${cat.pesoMaxG}g`;
  }
  return "Sin rango de peso";
};

export default function PreciosTable({
  mayoristas,
  categorias,
  canEditPrices,
  onOpenPrices,
  refreshKey = 0,
}: PreciosTableProps) {
  const [selectedClientId, setSelectedClientId] = useState<number | null>(
    mayoristas[0]?.id ?? null,
  );
  const [prices, setPrices] = useState<PrecioMayorista[]>([]);
  const [loading, setLoading] = useState(false);

  // Sync selectedClientId if mayoristas list changes
  useEffect(() => {
    if (selectedClientId === null && mayoristas.length > 0) {
      setSelectedClientId(mayoristas[0].id);
    }
  }, [mayoristas, selectedClientId]);

  // Load prices for selected client
  useEffect(() => {
    if (selectedClientId === null) {
      setPrices([]);
      return;
    }

    let isMounted = true;
    setLoading(true);

    getPreciosMayorista(selectedClientId)
      .then((data) => {
        if (isMounted) setPrices(data);
      })
      .catch(() => {
        if (isMounted) setPrices([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedClientId, refreshKey]);

  const selectedClient = mayoristas.find((m) => m.id === selectedClientId) ?? null;

  return (
    <Card elevation={0} sx={commercialTableCardSx}>
      {/* Toolbar */}
      <Box sx={commercialTableToolbarSx}>
        <Box>
          <Typography variant="h6" sx={commercialTableTitleSx}>
            Tarifario de Precios por Mayorista
          </Typography>
          <Typography variant="body2" sx={commercialTableDescriptionSx}>
            Precios por bandeja acordados según clasificación y peso del huevo.
          </Typography>
        </Box>

        <Box sx={commercialTableActionsSx}>
          <FormControl
            size="small"
            sx={{
              ...commercialTableFiltersSx,
              minWidth: 0,
              width: { xs: "100%", sm: 220 },
            }}
          >
            <Select
              value={selectedClientId ?? ""}
              onChange={(e) => setSelectedClientId(Number(e.target.value))}
              disabled={mayoristas.length === 0}
              sx={{
                minHeight: 40,
                fontWeight: 600,
                bgcolor: "background.paper",
              }}
            >
              {mayoristas.map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  {m.nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {canEditPrices && selectedClient && (
            <Button
              variant="contained"
              size="small"
              startIcon={<EditRoundedIcon sx={{ fontSize: 18 }} />}
              onClick={() => onOpenPrices(selectedClient)}
            >
              Editar precios
            </Button>
          )}
        </Box>
      </Box>

      {/* Mobile Card List View */}
      <Box sx={{ display: { xs: "grid", sm: "none" }, gap: 1, p: 1.5 }}>
        {loading ? (
          <Box sx={{ py: 5, textAlign: "center" }}>
            <CircularProgress size={28} />
          </Box>
        ) : mayoristas.length === 0 ? (
          <Box sx={{ py: 4, textAlign: "center", color: "text.secondary" }}>
            <Typography sx={{ fontWeight: 600 }}>
              No hay clientes mayoristas registrados
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              Registra un cliente mayorista para configurar sus precios.
            </Typography>
          </Box>
        ) : (
          categorias.map((cat) => {
            const priceRecord = prices.find(
              (p) => p.codigoCategoriaPeso === cat.codigo,
            );
            const hasPrice =
              priceRecord !== undefined &&
              Number(priceRecord.valorUnitario) > 0;

            return (
              <Box key={cat.codigo} sx={commercialTableMobileCardSx}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 1,
                    mb: 0.8,
                  }}
                >
                  <CategoryBadge codigo={cat.codigo} nombre={cat.nombre} />
                  <Chip
                    size="small"
                    variant="outlined"
                    color={hasPrice ? "success" : "default"}
                    label={hasPrice ? "Configurado" : "Sin definir"}
                  />
                </Box>

                <Typography variant="caption" color="text.secondary">
                  Rango de peso: {formatWeightRange(cat)}
                </Typography>

                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mt: 1,
                    pt: 1,
                    borderTop: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Precio por bandeja
                    </Typography>
                    {hasPrice ? (
                      <Typography sx={{ fontWeight: 800, fontSize: "1rem" }}>
                        {formatMoney(Number(priceRecord.valorUnitario))}
                      </Typography>
                    ) : (
                      <Typography
                        variant="body2"
                        color="text.disabled"
                        sx={{ fontStyle: "italic" }}
                      >
                        No asignado
                      </Typography>
                    )}
                  </Box>

                  {canEditPrices && selectedClient && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => onOpenPrices(selectedClient)}
                    >
                      Modificar
                    </Button>
                  )}
                </Box>
              </Box>
            );
          })
        )}
      </Box>

      {/* Desktop Table View */}
      <TableContainer sx={{ display: { xs: "none", sm: "block" } }}>
        <Table sx={commercialTableSx} aria-label="Tabla de precios por mayorista">
          <TableHead>
            <TableRow>
              <TableCell>CATEGORÍA</TableCell>
              <TableCell>RANGO DE PESO</TableCell>
              <TableCell align="right">PRECIO POR BANDEJA</TableCell>
              <TableCell align="center">ESTADO</TableCell>
              <TableCell align="center">ACCIONES</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : mayoristas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                  <Typography sx={{ fontWeight: 700 }}>
                    No hay clientes mayoristas registrados
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Registra un cliente mayorista para configurar sus precios.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              categorias.map((cat) => {
                const priceRecord = prices.find(
                  (p) => p.codigoCategoriaPeso === cat.codigo,
                );
                const hasPrice =
                  priceRecord !== undefined &&
                  Number(priceRecord.valorUnitario) > 0;

                return (
                  <TableRow key={cat.codigo} hover>
                    <TableCell>
                      <CategoryBadge codigo={cat.codigo} nombre={cat.nombre} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatWeightRange(cat)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {hasPrice ? (
                        <Typography sx={{ fontWeight: 800 }}>
                          {formatMoney(Number(priceRecord.valorUnitario))}
                        </Typography>
                      ) : (
                        <Typography
                          variant="body2"
                          color="text.disabled"
                          sx={{ fontStyle: "italic" }}
                        >
                          No asignado
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        size="small"
                        variant="outlined"
                        color={hasPrice ? "success" : "default"}
                        label={hasPrice ? "Configurado" : "Sin definir"}
                      />
                    </TableCell>
                    <TableCell align="center">
                      {canEditPrices && selectedClient && (
                        <Button
                          size="small"
                          onClick={() => onOpenPrices(selectedClient)}
                        >
                          Modificar
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
    </Card>
  );
}

