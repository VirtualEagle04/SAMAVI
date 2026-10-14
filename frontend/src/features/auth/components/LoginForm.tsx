import { useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import LoginFormFields from "./LoginFormFields";
import { useAuthStore } from "../stores/authStore";

function validate(username: string, password: string) {
  const errors = { username: "", password: "" };

  if (!username) {
    errors.username = "El usuario no puede estar vacío";
  }

  if (!password) {
    errors.password = "La contraseña no puede estar vacía";
  }

  return errors;
}

export default function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({
    username: "",
    password: "",
  });
  const [touched, setTouched] = useState(false);

  const { login, isLoading, error, clearError } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    const errors = validate(username, password);
    setFieldErrors(errors);
    if (errors.username || errors.password) return;

    clearError();
    // LoginPage redirige cuando la sesión queda activa
    await login(username, password);
  };

  const handleUsernameChange = (v: string) => {
    setUsername(v);
    if (touched)
      setFieldErrors((e) => ({
        ...e,
        username: validate(v, password).username,
      }));
    if (error) clearError();
  };

  const handlePasswordChange = (v: string) => {
    setPassword(v);
    if (touched)
      setFieldErrors((e) => ({
        ...e,
        password: validate(username, v).password,
      }));
    if (error) clearError();
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Stack spacing={3}>
        {error && (
          <Alert severity="error" variant="outlined" sx={{ fontWeight: 500 }}>
            {error}
          </Alert>
        )}

        <LoginFormFields
          username={username}
          password={password}
          usernameError={fieldErrors.username}
          passwordError={fieldErrors.password}
          disabled={isLoading}
          onUsernameChange={handleUsernameChange}
          onPasswordChange={handlePasswordChange}
        />

        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={isLoading}
          sx={{ mt: 1, minHeight: 48, fontSize: "0.95rem", fontWeight: 600 }}
        >
          {isLoading ? (
            <CircularProgress size={24} sx={{ color: "#fff" }} />
          ) : (
            "Iniciar Sesión"
          )}
        </Button>
      </Stack>
    </Box>
  );
}
