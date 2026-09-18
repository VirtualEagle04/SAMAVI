import Stack from "@mui/material/Stack"
import TextField from "@mui/material/TextField"
import PasswordField from "../atoms/PasswordField"

interface Props {
  username: string
  password: string
  usernameError: string
  passwordError: string
  disabled: boolean
  onUsernameChange: (v: string) => void
  onPasswordChange: (v: string) => void
}

export default function LoginFormFields({
  username,
  password,
  usernameError,
  passwordError,
  disabled,
  onUsernameChange,
  onPasswordChange,
}: Props) {
  return (
    <Stack spacing={2.5}>
      <TextField
        label="Usuario"
        value={username}
        onChange={(e) => onUsernameChange(e.target.value)}
        error={!!usernameError}
        helperText={usernameError || " "}
        disabled={disabled}
        autoComplete="username"
      />
      <PasswordField
        label="Contraseña"
        value={password}
        onChange={(e) => onPasswordChange(e.target.value)}
        error={!!passwordError}
        helperText={passwordError || " "}
        disabled={disabled}
        autoComplete="current-password"
      />
    </Stack>
  )
}
