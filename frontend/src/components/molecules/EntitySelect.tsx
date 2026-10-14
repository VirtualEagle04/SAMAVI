import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { tableControlSx } from "../tableStyles";

export interface EntityOption {
  value: number;
  /** Texto corto que se muestra ya seleccionado. */
  label: string;
  /** Texto completo en la lista desplegable; por defecto, `label`. */
  detail?: string;
}

interface EntitySelectProps {
  value: number | null;
  options: EntityOption[];
  placeholder: string;
  ariaLabel: string;
  onChange: (value: number) => void;
  disabled?: boolean;
}

/** Selector de una entidad (cliente, insumo) que cambia la vista; no es un filtro de lista. */
export default function EntitySelect({
  value,
  options,
  placeholder,
  ariaLabel,
  onChange,
  disabled,
}: EntitySelectProps) {
  return (
    <TextField
      select
      size="small"
      disabled={disabled}
      value={value ?? ""}
      onChange={(event) => onChange(Number(event.target.value))}
      slotProps={{
        htmlInput: { "aria-label": ariaLabel },
        select: {
          displayEmpty: true,
          renderValue: (selected) =>
            options.find((option) => option.value === Number(selected))?.label ??
            placeholder,
        },
      }}
      sx={{
        ...tableControlSx,
        width: { xs: "100%", sm: "auto" },
        minWidth: { sm: 220 },
        maxWidth: { sm: 360 },
      }}
    >
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value} sx={{ whiteSpace: "normal" }}>
          {option.detail ?? option.label}
        </MenuItem>
      ))}
    </TextField>
  );
}
