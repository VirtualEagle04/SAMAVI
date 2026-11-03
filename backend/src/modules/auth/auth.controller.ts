import type { Request, Response } from "express";
import { AppError } from "../../shared/errors/app-error.js";
import { loginLimiter } from "../../shared/security/login-limiter.js";
import { login, me } from "./auth.service.js";
import { parseLoginInput } from "./auth.schemas.js";

export async function loginController(request: Request, response: Response): Promise<void> {
  const input = parseLoginInput(request.body);
  const ip = request.ip ?? "desconocida";

  const espera = loginLimiter.segundosDeEspera(ip, input.login);
  if (espera !== null) {
    response.setHeader("Retry-After", String(espera));
    const minutos = Math.ceil(espera / 60);
    throw new AppError(429, `Demasiados intentos fallidos. Intenta de nuevo en ${minutos} ${minutos === 1 ? "minuto" : "minutos"}`);
  }

  try {
    const result = await login(input);
    loginLimiter.registrarExito(input.login);
    response.status(200).json(result);
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 401) {
      loginLimiter.registrarFallo(ip, input.login);
    }
    throw error;
  }
}

export async function meController(request: Request, response: Response): Promise<void> {
  if (!request.auth) {
    throw new AppError(401, "Token requerido");
  }
  response.json(await me(request.auth.id));
}
