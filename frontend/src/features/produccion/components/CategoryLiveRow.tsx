import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import { CATEGORY_COLORS } from "../../../components/atoms/CategoryBadge";
import type { CategoriaPeso } from "../types/produccion.types";
import { splitEggs } from "./liveMonitoring.utils";

interface CategoryLiveRowProps {
  categoria: CategoriaPeso;
  eggs: number;
  maxEggs: number;
  disabledActions: boolean;
  onQuickCount: (categoriaCodigo: string, cantidad: 1 | -1) => void;
}

const FALLBACK_COLORS = { bg: "#F0ECE7", text: "#51483F", border: "#9A8E80" };

export default function CategoryLiveRow({
  categoria,
  eggs,
  maxEggs,
  disabledActions,
  onQuickCount,
}: CategoryLiveRowProps) {
  const colors = CATEGORY_COLORS[categoria.codigo] ?? FALLBACK_COLORS;
  const { trays, eggs: looseEggs } = splitEggs(eggs);
  const barWidth = maxEggs > 0 ? (Math.max(0, eggs) / maxEggs) * 100 : 0;

  const actionSx = (tone: "success" | "error") => ({
    width: 40,
    height: 40,
    borderRadius: "6px",
    color: "common.white",
    bgcolor: `${tone}.main`,
    "&:hover": { bgcolor: `${tone}.dark` },
    "&.Mui-disabled": { bgcolor: "transparent", color: "text.disabled", border: "1px dashed", borderColor: "text.disabled" },
  });

  return (
    <Box
      role="listitem"
      sx={{
        position: "relative",
        overflow: "hidden",
        display: "grid",
        gridTemplateColumns: "auto minmax(0, 1fr) auto",
        gridTemplateAreas: `"badge numbers actions" "bar bar bar"`,
        alignItems: "center",
        columnGap: 1.5,
        rowGap: 1,
        p: 1.5,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: "8px",
        bgcolor: "background.paper",
      }}
    >
      {/* Destello breve cuando cambia el conteo de la categoría */}
      <Box
        key={eggs}
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          bgcolor: alpha(colors.border, 0.18),
          animation: "rowFlash 1.2s ease-out forwards",
          "@keyframes rowFlash": { from: { opacity: 1 }, to: { opacity: 0 } },
        }}
      />

      <Box sx={{ gridArea: "badge", position: "relative", minWidth: 64 }}>
        <Box
          sx={{
            display: "inline-flex",
            px: 1.25,
            py: 0.4,
            borderRadius: "6px",
            fontWeight: 800,
            fontSize: "0.85rem",
            bgcolor: colors.bg,
            color: colors.text,
            border: `1px solid ${colors.border}`,
          }}
        >
          {categoria.codigo}
        </Box>
      </Box>

      <Box sx={{ gridArea: "numbers", position: "relative", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 2, minWidth: 0 }}>
        {[
          { value: trays, label: "bandejas" },
          { value: looseEggs, label: "huevos" },
        ].map((item) => (
          <Box key={item.label} sx={{ textAlign: "center", minWidth: 56 }}>
            <Typography sx={{ fontSize: "1.5rem", fontWeight: 900, lineHeight: 1.1, color: item.value > 0 ? "text.primary" : "text.disabled" }}>
              {item.value.toLocaleString("es-CO")}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>
              {item.label}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ gridArea: "actions", position: "relative", display: "flex", gap: 0.75 }}>
        <Tooltip title="Descontar (−1)">
          <span>
            <IconButton
              aria-label={`Descontar un huevo ${categoria.nombre}`}
              onClick={() => onQuickCount(categoria.codigo, -1)}
              disabled={disabledActions}
              sx={actionSx("error")}
            >
              <RemoveRoundedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Agregar (+1)">
          <span>
            <IconButton
              aria-label={`Agregar un huevo ${categoria.nombre}`}
              onClick={() => onQuickCount(categoria.codigo, 1)}
              disabled={disabledActions}
              sx={actionSx("success")}
            >
              <AddRoundedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      <Box
        role="progressbar"
        aria-label={`${categoria.nombre}: ${Math.max(0, eggs)} huevos`}
        aria-valuemin={0}
        aria-valuemax={maxEggs}
        aria-valuenow={Math.max(0, eggs)}
        sx={{ gridArea: "bar", position: "relative", height: 8, borderRadius: 4, bgcolor: "background.default", overflow: "hidden" }}
      >
        <Box
          sx={{
            width: `${barWidth}%`,
            minWidth: eggs > 0 ? 4 : 0,
            height: "100%",
            borderRadius: 4,
            bgcolor: colors.border,
            transition: "width 240ms ease",
          }}
        />
      </Box>
    </Box>
  );
}
