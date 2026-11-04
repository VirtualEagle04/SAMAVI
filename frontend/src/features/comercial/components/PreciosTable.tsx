import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Card from "@mui/material/Card";
import LinearProgress from "@mui/material/LinearProgress";
import Skeleton from "@mui/material/Skeleton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import PaidOutlinedIcon from "@mui/icons-material/PaidOutlined";
import CategoryBadge from "../../../components/atoms/CategoryBadge";
import EmptyState from "../../../components/molecules/EmptyState";
import EntitySelect from "../../../components/molecules/EntitySelect";
import TableToolbar from "../../../components/molecules/TableToolbar";
import FeedbackAlert from "../../../components/organisms/FeedbackAlert";
import { tableCardSx, tableSx } from "../../../components/tableStyles";
import { getPreciosMayorista } from "../services/comercialService";
import type { CategoriaComercial, Mayorista, PrecioMayorista } from "../types/comercial.types";
import { formatPesos, formatWeightRange, precioConfigurado } from "./comercial.format";

interface PreciosTableProps {
  mayoristas: Mayorista[];
  categorias: CategoriaComercial[];
  canEditPrices: boolean;
  /** Abre el editor del cliente; `categoria` enfoca esa fila. */
  onOpenPrices: (cliente: Mayorista, categoria?: string) => void;
  /** Cambia tras guardar precios para volver a consultarlos. */
  refreshKey?: number;
}

const SinPrecio = () => (
  <Typography variant="body2" color="text.disabled" sx={{ fontStyle: "italic" }}>
    Sin precio
  </Typography>
);

export default function PreciosTable({
  mayoristas,
  categorias,
  canEditPrices,
  onOpenPrices,
  refreshKey = 0,
}: PreciosTableProps) {
  const [selectedClientId, setSelectedClientId] = useState<number | null>(mayoristas[0]?.id ?? null);
  const [prices, setPrices] = useState<PrecioMayorista[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Si aún no hay cliente elegido, se toma el primero cuando llega la lista.
  useEffect(() => {
    if (selectedClientId === null && mayoristas.length > 0) {
      setSelectedClientId(mayoristas[0].id);
    }
  }, [mayoristas, selectedClientId]);

  useEffect(() => {
    if (selectedClientId === null) {
      setPrices([]);
      return;
    }
    let isMounted = true;
    setLoading(true);
    setError("");
    getPreciosMayorista(selectedClientId)
      .then((data) => {
        if (isMounted) setPrices(data);
      })
      .catch((e: unknown) => {
        if (!isMounted) return;
        setPrices([]);
        setError(e instanceof Error ? e.message : "No se pudieron cargar los precios.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [selectedClientId, refreshKey]);

  const selectedClient = mayoristas.find((m) => m.id === selectedClientId) ?? null;
  const priceOf = (codigo: string) =>
    precioConfigurado(prices.find((p) => p.codigoCategoriaPeso === codigo));
  const configured = categorias.filter((cat) => priceOf(cat.codigo) !== null).length;
  // La primera carga dibuja esqueletos; al cambiar de cliente se conserva la tabla con una barra.
  const firstLoad = loading && prices.length === 0;
  const canEdit = canEditPrices && selectedClient !== null;
  const openRow = (codigo?: string) => {
    if (canEdit && selectedClient) onOpenPrices(selectedClient, codigo);
  };

  const description = selectedClient
    ? loading
      ? `Consultando los precios de ${selectedClient.nombre}…`
      : `${configured} de ${categorias.length} categorías con precio para ${selectedClient.nombre}.`
    : "Elige un mayorista para ver lo que paga por bandeja.";

  return (
    <Card elevation={0} sx={tableCardSx}>
      <TableToolbar
        title="Precios por mayorista"
        description={description}
        actions={
          <>
            <EntitySelect
              value={selectedClientId}
              placeholder="Selecciona un mayorista"
              ariaLabel="Mayorista"
              disabled={mayoristas.length === 0}
              options={mayoristas.map((m) => ({ value: m.id, label: m.nombre }))}
              onChange={setSelectedClientId}
            />
            {canEdit && (
              <Button
                variant="contained"
                startIcon={<EditRoundedIcon sx={{ fontSize: 18 }} />}
                onClick={() => openRow()}
                disabled={loading}
                sx={{ width: { xs: "100%", sm: "auto" } }}
              >
                Editar precios
              </Button>
            )}
          </>
        }
      />
      {loading && !firstLoad && <LinearProgress sx={{ height: 2 }} />}

      {mayoristas.length === 0 ? (
        <EmptyState
          icon={<PaidOutlinedIcon />}
          title="No hay clientes mayoristas registrados"
          description="Registra un cliente desde un nuevo pedido para configurar sus precios."
        />
      ) : error ? (
        <Box sx={{ p: 2 }}>
          <FeedbackAlert severity="error">{error}</FeedbackAlert>
        </Box>
      ) : (
        <>
          {/* Móvil: lista compacta; tocar una fila abre el editor en esa categoría. */}
          <Box component="ul" sx={{ display: { xs: "block", sm: "none" }, listStyle: "none", m: 0, p: 0 }}>
            {categorias.map((cat) => {
              const price = priceOf(cat.codigo);
              const content = (
                <>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <CategoryBadge codigo={cat.codigo} nombre={cat.nombre} />
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                      {formatWeightRange(cat)}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    {firstLoad ? (
                      <Skeleton variant="text" width={96} />
                    ) : price !== null ? (
                      <Typography sx={{ fontWeight: 800 }}>{formatPesos(price)}</Typography>
                    ) : (
                      <SinPrecio />
                    )}
                  </Box>
                  {canEdit && <ChevronRightRoundedIcon sx={{ color: "text.disabled" }} />}
                </>
              );
              const rowSx = {
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                width: "100%",
                px: 2,
                py: 1.5,
                textAlign: "left",
              } as const;
              return (
                <Box component="li" key={cat.codigo} sx={{ borderTop: "1px solid", borderColor: "divider", "&:first-of-type": { borderTop: 0 } }}>
                  {canEdit ? (
                    <ButtonBase
                      onClick={() => openRow(cat.codigo)}
                      disabled={loading}
                      aria-label={`Editar precio de ${cat.nombre}`}
                      sx={rowSx}
                    >
                      {content}
                    </ButtonBase>
                  ) : (
                    <Box sx={rowSx}>{content}</Box>
                  )}
                </Box>
              );
            })}
          </Box>

          {/* Escritorio */}
          <TableContainer sx={{ display: { xs: "none", sm: "block" } }}>
            <Table sx={tableSx} aria-label="Precios por bandeja del mayorista">
              <TableHead>
                <TableRow>
                  <TableCell>CATEGORÍA</TableCell>
                  <TableCell>RANGO DE PESO</TableCell>
                  <TableCell align="right">PRECIO POR BANDEJA</TableCell>
                  {canEdit && <TableCell align="right" sx={{ width: 120 }} />}
                </TableRow>
              </TableHead>
              <TableBody>
                {categorias.map((cat) => {
                  const price = priceOf(cat.codigo);
                  return (
                    <TableRow key={cat.codigo} hover={canEdit}>
                      <TableCell>
                        <CategoryBadge codigo={cat.codigo} nombre={cat.nombre} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatWeightRange(cat)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {firstLoad ? (
                          <Skeleton variant="text" width={110} sx={{ ml: "auto" }} />
                        ) : price !== null ? (
                          <Typography sx={{ fontWeight: 800 }}>{formatPesos(price)}</Typography>
                        ) : (
                          <SinPrecio />
                        )}
                      </TableCell>
                      {canEdit && (
                        <TableCell align="right">
                          <Button
                            size="small"
                            onClick={() => openRow(cat.codigo)}
                            disabled={loading}
                            aria-label={`${price === null ? "Asignar" : "Cambiar"} precio de ${cat.nombre}`}
                          >
                            {price === null ? "Asignar" : "Cambiar"}
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Card>
  );
}
