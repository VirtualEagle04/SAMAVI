import { AppError } from "../errors/app-error.js";
import { COMMON_PASSWORDS } from "./common-passwords.js";

/**
 * Política de contraseñas según NIST SP 800-63B: longitud mínima, sin reglas
 * de composición (se aceptan espacios y Unicode) y rechazo de contraseñas
 * conocidas o derivadas de la cuenta.
 */
export const PASSWORD_MIN_CARACTERES = 12;
/** bcrypt ignora lo que pase de 72 bytes. */
export const PASSWORD_MAX_BYTES = 72;
export const BCRYPT_COSTO = 12;

const encoder = new TextEncoder();

export function parsePassword(value: unknown, login: string): string {
  if (typeof value !== "string" || value === "") {
    throw new AppError(400, "La contraseña es obligatoria");
  }
  if ([...value].length < PASSWORD_MIN_CARACTERES) {
    throw new AppError(400, `La contraseña debe tener al menos ${PASSWORD_MIN_CARACTERES} caracteres`);
  }
  if (encoder.encode(value).length > PASSWORD_MAX_BYTES) {
    throw new AppError(400, `La contraseña no puede superar ${PASSWORD_MAX_BYTES} bytes (unos ${PASSWORD_MAX_BYTES} caracteres sin tildes)`);
  }

  const normalizada = value.toLowerCase();
  if (login.length >= 3 && normalizada.includes(login.toLowerCase())) {
    throw new AppError(400, "La contraseña no puede contener el login");
  }
  if (new Set(normalizada).size === 1) {
    throw new AppError(400, "La contraseña no puede repetir un solo carácter");
  }
  if (COMMON_PASSWORDS.has(normalizada)) {
    throw new AppError(400, "La contraseña es demasiado común; usa una frase propia");
  }
  return value;
}
