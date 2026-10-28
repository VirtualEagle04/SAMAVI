import type { Prisma } from "@prisma/client";
import type { Request } from "express";
import { AppError } from "../errors/app-error.js";

/** Quién hizo la operación y desde dónde; lo arma el controlador. */
export type AuditContext = {
  userId: number;
  ip: string | undefined;
};

export type AccionAuditoria = "INSERT" | "UPDATE" | "DELETE";

export type EntradaAuditoria = {
  /** Nombre de la tabla en `database/schema.sql`. */
  tabla: string;
  idRegistro: string | number;
  accion: AccionAuditoria;
  antes?: Prisma.InputJsonValue;
  despues?: Prisma.InputJsonValue;
};

const IP_MAX = 45;

export function auditContext(request: Request): AuditContext {
  if (!request.auth) {
    throw new AppError(401, "Token requerido");
  }
  return { userId: request.auth.id, ip: request.ip };
}

/**
 * Registra una operación exitosa. Se llama con el cliente de la misma
 * transacción que hace el cambio: si el cambio falla, no queda registro.
 */
export async function registrarAuditoria(
  transaction: Prisma.TransactionClient,
  context: AuditContext,
  entrada: EntradaAuditoria,
): Promise<void> {
  await transaction.auditoria.create({
    data: {
      idUsuario: context.userId,
      tablaAfectada: entrada.tabla,
      idRegistroAfectado: String(entrada.idRegistro),
      accion: entrada.accion,
      ...(entrada.antes === undefined ? {} : { datosAnteriores: entrada.antes }),
      ...(entrada.despues === undefined ? {} : { datosNuevos: entrada.despues }),
      ...(context.ip === undefined ? {} : { ipOrigen: context.ip.slice(0, IP_MAX) }),
      resultado: "EXITOSO",
    },
  });
}
