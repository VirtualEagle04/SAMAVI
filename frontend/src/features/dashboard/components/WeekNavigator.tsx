import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { tableControlSx } from "../../../components/tableStyles";
import { WEEK_DAYS, shiftDate } from "./weeklySummary.utils";

type WeekNavigatorProps = {
  /** Primer día de la semana mostrada (YYYY-MM-DD). */
  value: string | undefined;
  onChange: (desde: string) => void;
  disabled?: boolean;
};

export default function WeekNavigator({ value, onChange, disabled }: WeekNavigatorProps) {
  const move = (direction: -1 | 1) => {
    if (value) onChange(shiftDate(value, direction * WEEK_DAYS));
  };
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      <Tooltip title="Semana anterior">
        <span>
          <IconButton
            onClick={() => move(-1)}
            disabled={!value || disabled}
            aria-label="Semana anterior"
          >
            <ChevronLeftRoundedIcon />
          </IconButton>
        </span>
      </Tooltip>
      <TextField
        type="date"
        size="small"
        label="Inicio de semana"
        value={value ?? ""}
        onChange={(event) => {
          if (event.target.value) onChange(event.target.value);
        }}
        slotProps={{ inputLabel: { shrink: true }, input: { notched: true } }}
        sx={{ ...tableControlSx, bgcolor: "background.paper" }}
      />
      <Tooltip title="Semana siguiente">
        <span>
          <IconButton
            onClick={() => move(1)}
            disabled={!value || disabled}
            aria-label="Semana siguiente"
          >
            <ChevronRightRoundedIcon />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
}
