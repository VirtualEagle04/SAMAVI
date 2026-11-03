import type { ReactNode } from "react"
import IconButton from "@mui/material/IconButton"
import Tooltip from "@mui/material/Tooltip"

type Props = {
  label: string
  icon: ReactNode
  onClick: () => void
  /** Si se indica, la acción se deshabilita y el tooltip explica por qué. */
  disabledReason?: string
  color?: "default" | "error" | "primary"
}

/** Botón de icono de una fila, con nombre accesible y motivo visible si está deshabilitado. */
export default function RowAction({ label, icon, onClick, disabledReason, color = "default" }: Props) {
  return (
    <Tooltip title={disabledReason ?? label}>
      {/* El span permite mostrar el tooltip aunque el botón esté deshabilitado. */}
      <span>
        <IconButton size="small" aria-label={label} onClick={onClick} disabled={Boolean(disabledReason)} color={color}>
          {icon}
        </IconButton>
      </span>
    </Tooltip>
  )
}
