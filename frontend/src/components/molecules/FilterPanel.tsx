import { useState } from "react";
import type { MouseEvent } from "react";
import FilterListRoundedIcon from "@mui/icons-material/FilterListRounded";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Drawer from "@mui/material/Drawer";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Popover from "@mui/material/Popover";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { tableControlSx } from "../tableStyles";
import type { FilterField } from "./filterTypes";

interface FilterPanelProps {
  fields: FilterField[];
  values: Record<string, string>;
  activeCount: number;
  onChange: (key: string, value: string) => void;
  onReset: () => void;
}

const panelPaperSx = {
  border: "1px solid",
  borderColor: "divider",
  boxShadow: "0 8px 24px rgba(58, 42, 30, 0.18)",
};

function FilterControl({
  field,
  value,
  onChange,
}: {
  field: FilterField;
  value: string;
  onChange: (value: string) => void;
}) {
  if (field.type === "switch") {
    return (
      <FormControlLabel
        label={field.label}
        control={
          <Switch
            checked={value === "1"}
            onChange={(event) => onChange(event.target.checked ? "1" : "")}
          />
        }
      />
    );
  }

  if (field.type === "date") {
    return (
      <TextField
        type="date"
        size="small"
        label={field.label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        slotProps={{ inputLabel: { shrink: true }, input: { notched: true } }}
        sx={tableControlSx}
      />
    );
  }

  return (
    <TextField
      select
      size="small"
      label={field.label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      slotProps={{
        inputLabel: { shrink: true },
        input: { notched: true },
        select: {
          displayEmpty: true,
          renderValue: (selected) =>
            field.options.find((option) => option.value === selected)?.label ??
            field.allLabel,
        },
      }}
      sx={tableControlSx}
    >
      <MenuItem value="">{field.allLabel}</MenuItem>
      {field.options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );
}

export default function FilterPanel({
  fields,
  values,
  activeCount,
  onChange,
  onReset,
}: FilterPanelProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const open = anchor !== null;
  const close = () => setAnchor(null);

  const content = (
    <Box sx={{ p: 2, width: { xs: "auto", sm: 320 }, display: "grid", gap: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        Filtros
      </Typography>
      {fields.map((field) => (
        <FilterControl
          key={field.key}
          field={field}
          value={values[field.key] ?? ""}
          onChange={(value) => onChange(field.key, value)}
        />
      ))}
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
        <Button onClick={onReset} disabled={activeCount === 0}>
          Limpiar
        </Button>
        <Button variant="contained" onClick={close}>
          Listo
        </Button>
      </Box>
    </Box>
  );

  return (
    <>
      <Badge
        badgeContent={activeCount}
        color="secondary"
        invisible={activeCount === 0}
      >
        <Button
          variant="outlined"
          color="inherit"
          startIcon={<FilterListRoundedIcon />}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={(event: MouseEvent<HTMLElement>) => setAnchor(event.currentTarget)}
          sx={{ borderColor: "divider", whiteSpace: "nowrap" }}
        >
          Filtros
        </Button>
      </Badge>

      {isMobile ? (
        <Drawer
          anchor="bottom"
          open={open}
          onClose={close}
          slotProps={{ paper: { sx: { ...panelPaperSx, borderTopLeftRadius: 16, borderTopRightRadius: 16 } } }}
        >
          {content}
        </Drawer>
      ) : (
        <Popover
          open={open}
          anchorEl={anchor}
          onClose={close}
          slotProps={{ paper: { sx: { ...panelPaperSx, mt: 0.5, borderRadius: 2 } } }}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
        >
          {content}
        </Popover>
      )}
    </>
  );
}
