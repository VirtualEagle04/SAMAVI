import Chip from "@mui/material/Chip";

export const CATEGORY_COLORS: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  Y: { bg: "#F7E5B5", text: "#5C4333", border: "#D99B26" },
  Ex: { bg: "#F3DFD5", text: "#743F2A", border: "#C87A57" },
  AA: { bg: "#EDE3D1", text: "#665331", border: "#A88C52" },
  A: { bg: "#E6EBDD", text: "#40573A", border: "#6B8E62" },
  B: { bg: "#EFE3D9", text: "#674433", border: "#A66B48" },
  C: { bg: "#F3DEDA", text: "#753D39", border: "#C05C56" },
  P: { bg: "#F0ECE7", text: "#51483F", border: "#9A8E80" },
  Q: { bg: "#E9E1DC", text: "#4A3325", border: "#5C4333" },
};

type Props = {
  codigo: string;
  /** @deprecated El chip siempre muestra el código de la categoría. */
  nombre?: string;
  cantidad?: number;
  size?: "small" | "medium";
};

export default function CategoryBadge({
  codigo,
  cantidad,
  size = "small",
}: Props) {
  const colors = CATEGORY_COLORS[codigo] ?? {
    bg: "#F0ECE7",
    text: "#51483F",
    border: "#9A8E80",
  };
  const label = [
    codigo,
    cantidad === undefined ? null : `${cantidad} band.`,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <Chip
      label={label}
      size={size}
      sx={{
        fontWeight: 800,
        fontSize: "0.75rem",
        borderRadius: 0.8,
        bgcolor: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
      }}
    />
  );
}
