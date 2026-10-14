import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CategoryPie, { type PieSlice } from "./CategoryPie";

interface LiveSummaryProps {
  totalEggs: number;
  galponTotals?: { id: number; nombre: string; eggs: number }[];
  slices: PieSlice[];
}

export default function LiveSummary({ totalEggs, galponTotals = [], slices }: LiveSummaryProps) {
  return (
    <Box
      sx={{
        px: { xs: 2, sm: 2.5 },
        py: 2,
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: "center",
        justifyContent: "space-between",
        gap: { xs: 2, sm: 3 },
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <Box sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}>
        <Typography
          variant="caption"
          sx={{ fontWeight: 800, letterSpacing: 0.6, color: "text.secondary" }}
        >
          PRODUCCIÓN DE HOY
        </Typography>
        <Typography sx={{ fontSize: { xs: "2rem", sm: "2.5rem" }, fontWeight: 900, lineHeight: 1.1, color: "primary.main" }}>
          {Math.max(0, totalEggs).toLocaleString("es-CO")}
          <Typography component="span" variant="body2" sx={{ ml: 0.75, fontWeight: 700, color: "text.secondary" }}>
            huevos
          </Typography>
        </Typography>
        {galponTotals.length > 1 && (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 1 }}>
            {galponTotals.map((g) => (
              <Typography
                key={g.id}
                variant="caption"
                sx={{ px: 1, py: 0.25, borderRadius: "6px", border: "1px solid", borderColor: "divider", fontWeight: 700 }}
              >
                {g.nombre}: {g.eggs.toLocaleString("es-CO")}
              </Typography>
            ))}
          </Box>
        )}
      </Box>

      <CategoryPie slices={slices} />
    </Box>
  );
}
