import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import { describeFilterValue } from "./filterTypes";
import type { FilterField } from "./filterTypes";

interface ActiveFilterChipsProps {
  fields: FilterField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onReset: () => void;
}

export default function ActiveFilterChips({
  fields,
  values,
  onChange,
  onReset,
}: ActiveFilterChipsProps) {
  const active = fields.filter((field) => (values[field.key] ?? "") !== "");
  if (active.length === 0) return null;

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
      {active.map((field) => (
        <Chip
          key={field.key}
          size="small"
          label={describeFilterValue(field, values[field.key])}
          onDelete={() => onChange(field.key, "")}
        />
      ))}
      {active.length > 1 && (
        <Button size="small" onClick={onReset}>
          Limpiar todo
        </Button>
      )}
    </Box>
  );
}
