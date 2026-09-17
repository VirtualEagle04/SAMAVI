import { AppError } from "../../shared/errors/app-error.js";

export type LoginInput = {
  login: string;
  password: string;
};

export function parseLoginInput(body: unknown): LoginInput {
  if (typeof body !== "object" || body === null) {
    throw new AppError(400, "El cuerpo de la solicitud es inválido");
  }

  const input = body as Record<string, unknown>;
  if (
    typeof input.login !== "string" ||
    input.login.trim() === "" ||
    typeof input.password !== "string" ||
    input.password === ""
  ) {
    throw new AppError(400, "login y password son obligatorios");
  }

  return { login: input.login.trim(), password: input.password };
}