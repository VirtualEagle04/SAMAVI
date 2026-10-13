import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import StoreRoundedIcon from "@mui/icons-material/StoreRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { pluralize } from "../../../utils/plural";
import EmptyState from "../../../components/molecules/EmptyState";
import type { Proveedor } from "../types/inventario.types";
import TableToolbar from "../../../components/molecules/TableToolbar";
import {
  tableCardSx,
  tableMobileCardSx,
  tableMobilePrimaryTextSx,
} from "../../../components/tableStyles";

// Área táctil mayor en móvil; en escritorio se conserva el tamaño compacto.
const touchTargetSx = { p: { xs: 1.25, sm: 0.625 } };

export default function ProveedoresView({
  providers,
  onNew,
  onEdit,
  onToggle,
  onDelete,
}: {
  providers: Proveedor[];
  onNew: () => void;
  onEdit: (provider: Proveedor) => void;
  onToggle: (provider: Proveedor) => Promise<void>;
  onDelete: (provider: Proveedor) => Promise<void>;
}) {
  return (
    <Card elevation={0} sx={tableCardSx}>
      <TableToolbar
        title="Proveedores"
        description={`${pluralize(providers.length, "proveedor", "proveedores")} · contactos para abastecer la operación.`}
        actions={
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={onNew}
            sx={{ whiteSpace: "nowrap" }}
          >
            Nuevo proveedor
          </Button>
        }
      />

      {providers.length === 0 ? (
        <EmptyState
          icon={<StoreRoundedIcon />}
          title="Sin proveedores"
          description="Agrega los contactos que abastecen tu bodega."
        />
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              lg: "repeat(3, 1fr)",
            },
            gap: 1.5,
            p: 1.5,
          }}
        >
          {providers.map((provider) => (
            <Box key={provider.id} sx={tableMobileCardSx}>
              <Stack
                direction="row"
                sx={{ justifyContent: "space-between", alignItems: "flex-start" }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <StoreRoundedIcon
                    sx={{ color: "primary.main", mb: 0.5, fontSize: 22 }}
                  />
                  <Typography sx={tableMobilePrimaryTextSx}>
                    {provider.nombre}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {String(provider.contacto?.telefono ?? "Sin teléfono")}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {String(provider.contacto?.email ?? "Sin correo")}
                  </Typography>
                </Box>
                <IconButton
                  aria-label={`Editar ${provider.nombre}`}
                  title="Editar"
                  size="small"
                  sx={touchTargetSx}
                  onClick={() => onEdit(provider)}
                >
                  <EditRoundedIcon fontSize="small" />
                </IconButton>
              </Stack>
              <Stack
                direction="row"
                sx={{
                  justifyContent: "space-between",
                  alignItems: "center",
                  mt: 1.5,
                  pt: 1,
                  borderTop: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Chip
                  size="small"
                  label={provider.activo ? "Activo" : "Inactivo"}
                  color={provider.activo ? "success" : "default"}
                />
                <Stack direction="row" sx={{ alignItems: "center" }}>
                  <Switch
                    checked={provider.activo}
                    onChange={() => void onToggle(provider)}
                    slotProps={{
                      input: {
                        "aria-label": `${provider.activo ? "Desactivar" : "Activar"} ${provider.nombre}`,
                      },
                    }}
                    size="small"
                  />
                  <IconButton
                    aria-label={`Eliminar ${provider.nombre} permanentemente`}
                    title="Eliminar permanentemente"
                    size="small"
                    sx={touchTargetSx}
                    onClick={() => void onDelete(provider)}
                  >
                    <DeleteOutlineRoundedIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Stack>
            </Box>
          ))}
        </Box>
      )}
    </Card>
  );
}
