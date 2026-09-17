import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../shared/errors/app-error.js";

export type AuthUser = {
  id: number;
  rol: string;
};

declare global {
  namespace Express {
    interface Request {
      auth?: AuthUser;
    }
  }
}

function isAuthPayload(payload: string | JwtPayload): payload is JwtPayload & AuthUser {
  return (
    typeof payload !== "string" &&
    typeof payload.id === "number" &&
    typeof payload.rol === "string"
  );
}

export function authenticate(request: Request, _response: Response, next: NextFunction): void {
  const authorization = request.header("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;

  if (!token) {
    next(new AppError(401, "Token requerido"));
    return;
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    if (!isAuthPayload(payload)) {
      next(new AppError(401, "Token inválido"));
      return;
    }

    request.auth = { id: payload.id, rol: payload.rol };
    next();
  } catch {
    next(new AppError(401, "Token inválido o expirado"));
  }
}

export function requireRole(...roles: string[]) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    if (!request.auth || !roles.includes(request.auth.rol)) {
      next(new AppError(403, "Rol insuficiente"));
      return;
    }
    next();
  };
}