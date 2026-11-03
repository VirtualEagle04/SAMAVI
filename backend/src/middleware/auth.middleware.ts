import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../database/prisma.js";
import { AppError } from "../shared/errors/app-error.js";

/** Usuario autenticado con su rol y permisos actuales, leídos de la base. */
export type AuthUser = {
  id: number;
  rol: string;
  rolId: number;
  permisos: ReadonlySet<string>;
};

/** Contenido del JWT: `tv` es la `token_version` del usuario al firmarlo. */
export type TokenPayload = {
  id: number;
  tv: number;
};

declare global {
  namespace Express {
    interface Request {
      auth?: AuthUser;
    }
  }
}

function isTokenPayload(payload: string | JwtPayload): payload is JwtPayload & TokenPayload {
  return (
    typeof payload !== "string" &&
    typeof payload.id === "number" &&
    typeof payload.tv === "number"
  );
}

/**
 * Verifica el JWT y que la sesión siga vigente: el usuario existe, está activo
 * y su `token_version` no cambió desde que se firmó el token. El rol y los
 * permisos se leen en cada solicitud, así que un cambio aplica de inmediato.
 */
export async function authenticate(request: Request, _response: Response, next: NextFunction): Promise<void> {
  const authorization = request.header("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;

  if (!token) {
    next(new AppError(401, "Token requerido"));
    return;
  }

  let payload: string | JwtPayload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    next(new AppError(401, "Token inválido o expirado"));
    return;
  }
  if (!isTokenPayload(payload)) {
    next(new AppError(401, "Token inválido"));
    return;
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: payload.id },
    select: {
      activo: true,
      tokenVersion: true,
      rol: {
        select: {
          id: true,
          nombre: true,
          permisos: { select: { permiso: { select: { codigo: true } } } },
        },
      },
    },
  });
  if (!usuario || !usuario.activo || usuario.tokenVersion !== payload.tv) {
    next(new AppError(401, "La sesión ya no es válida; inicia sesión de nuevo"));
    return;
  }

  request.auth = {
    id: payload.id,
    rol: usuario.rol.nombre,
    rolId: usuario.rol.id,
    permisos: new Set(usuario.rol.permisos.map(({ permiso }) => permiso.codigo)),
  };
  next();
}

export function requirePermission(permissionCode: string) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    if (!request.auth) {
      next(new AppError(401, "Token requerido"));
      return;
    }
    if (!request.auth.permisos.has(permissionCode)) {
      next(new AppError(403, "Permiso insuficiente"));
      return;
    }
    next();
  };
}
