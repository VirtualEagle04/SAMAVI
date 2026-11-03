import { useState } from "react"
import IconButton from "@mui/material/IconButton"
import InputAdornment from "@mui/material/InputAdornment"
import TextField from "@mui/material/TextField"
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded"
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded"

/** Mínimo de la política del backend (NIST SP 800-63B); el resto lo valida el backend. */
export const PASSWORD_MIN = 12

type Props = {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  disabled?: boolean
  autoFocus?: boolean
}

export default function PasswordField({ label, value, onChange, error, disabled, autoFocus }: Props) {
  const [visible, setVisible] = useState(false)
  const corta = value.length > 0 && [...value].length < PASSWORD_MIN

  return (
    <TextField
      label={label}
      type={visible ? "text" : "password"}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      autoFocus={autoFocus}
      required
      fullWidth
      error={Boolean(error)}
      helperText={
        error ||
        (corta
          ? `Faltan ${PASSWORD_MIN - [...value].length} caracteres`
          : `Mínimo ${PASSWORD_MIN} caracteres. Puede ser una frase; evita contraseñas comunes o que contengan el login.`)
      }
      slotProps={{
        htmlInput: { autoComplete: "new-password", spellCheck: false, autoCapitalize: "none" },
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
                aria-pressed={visible}
                onClick={() => setVisible((current) => !current)}
                edge="end"
                disabled={disabled}
              >
                {visible ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  )
}
