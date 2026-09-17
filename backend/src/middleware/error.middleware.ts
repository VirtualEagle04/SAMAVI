import type { ErrorRequestHandler } from "express";
import { AppError } from "../shared/errors/app-error.js";

export const errorMiddleware: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({ error: error.message });
    return;
  }

  console.error(error);
  response.status(500).json({ error: "Error interno del servidor" });
};