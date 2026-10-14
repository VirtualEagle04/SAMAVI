import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import SearchField from "../atoms/SearchField";
import {
  tableActionsSx,
  tableDescriptionSx,
  tableHeaderRowSx,
  tableTitleSx,
  tableToolbarSx,
} from "../tableStyles";
import ActiveFilterChips from "./ActiveFilterChips";
import FilterPanel from "./FilterPanel";
import type { FilterField } from "./filterTypes";

interface TableToolbarFilters {
  fields: FilterField[];
  values: Record<string, string>;
  activeCount: number;
  onChange: (key: string, value: string) => void;
  onReset: () => void;
}

interface TableToolbarProps {
  title: string;
  description?: string;
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
  };
  filters?: TableToolbarFilters;
  /** Botones de acción de la tabla (crear, cerrar día, etc.). */
  actions?: ReactNode;
}

export default function TableToolbar({
  title,
  description,
  search,
  filters,
  actions,
}: TableToolbarProps) {
  return (
    <Box sx={tableToolbarSx}>
      <Box sx={tableHeaderRowSx}>
        <Box>
          <Typography variant="h6" sx={tableTitleSx}>
            {title}
          </Typography>
          {description && (
            <Typography sx={tableDescriptionSx}>{description}</Typography>
          )}
        </Box>
        {actions && <Box sx={tableActionsSx}>{actions}</Box>}
      </Box>

      {(search || filters) && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {search && <SearchField {...search} />}
          {filters && <FilterPanel {...filters} />}
        </Box>
      )}

      {filters && <ActiveFilterChips {...filters} />}
    </Box>
  );
}
