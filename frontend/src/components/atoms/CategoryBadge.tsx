import Chip from "@mui/material/Chip";

export const CATEGORY_COLORS: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  Y: { bg: "#fef3c7", text: "#92400e", border: "#fde68a" },
  Ex: { bg: "#fce7f3", text: "#9d174d", border: "#fbcfe8" },
  AA: { bg: "#e0f2fe", text: "#075985", border: "#bae6fd" },
  A: { bg: "#dcfce7", text: "#166534", border: "#bbf7d0" },
  B: { bg: "#ffedd5", text: "#9a3412", border: "#fed7aa" },
  C: { bg: "#f3e8ff", text: "#6b21a8", border: "#e9d5ff" },
  P: { bg: "#f1f5f9", text: "#334155", border: "#cbd5e1" },
  Q: { bg: "#f1f5f9", text: "#334155", border: "#cbd5e1" },
};

type Props = {
  codigo: string;
  nombre?: string;
  cantidad?: number;
  size?: "small" | "medium";
};

export default function CategoryBadge({
  codigo,
  nombre,
  cantidad,
  size = "small",
}: Props) {
  const colors = CATEGORY_COLORS[codigo] ?? {
    bg: "#f1f5f9",
    text: "#334155",
    border: "#cbd5e1",
  };
  const label = [
    nombre ?? codigo,
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
