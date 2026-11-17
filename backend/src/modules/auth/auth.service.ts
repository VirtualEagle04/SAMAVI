import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../../config/env.js";
import { prisma } from "../../database/prisma.js";
import { registrarAuditoria } from "../../shared/audit/auditoria.js";
import { AppError } from "../../shared/errors/app-error.js";
import type { TokenPayload } from "../../middleware/auth.middleware.js";
import type { LoginInput } from "./auth.schemas.js";

/**
 * Hash bcrypt (costo 12) de un valor aleatorio descartado. Si el login no existe
 * o está inactivo se compara contra él, para que el tiempo de respuesta no
 * revele qué cuentas existen.
 */
const HASH_FICTICIO = "$2b$12$CxDOhXmCq53NMnT389RMb.oxTl799HTQKvY1ODvWhFogP/NWeo3/q";

const usuarioConPermisos = {
  rol: {
    include: {
      permisos: { include: { permiso: true } },
    },
  },
} as const;

type UsuarioSesion = {
  id: number;
  nombre: string;
  login: string;
  rol: { nombre: string; permisos: { permiso: { codigo: string } }[] };
};

function sesion(user: UsuarioSesion) {
  const permisos = user.rol.permisos.map(({ permiso }) => permiso.codigo);
  return {
    user: {
      id: user.id,
      nombre: user.nombre,
      login: user.login,
      rol: user.rol.nombre,
      permisos,
    },
    permissions: permisos,
  };
}

/**
 * Valida las credenciales y emite el token. Un inicio de sesión exitoso queda en
 * la auditoría (acción `LOGIN`). Los fallidos no: con un login inexistente no hay
 * usuario al que asociarlos, y registrar solo los de cuentas existentes haría que
 * el tiempo de respuesta revelara qué cuentas existen.
 */
export async function login(input: LoginInput, ip?: string) {
  const user = await prisma.usuario.findUnique({
    where: { login: input.login },
    include: usuarioConPermisos,
  });

  const vigente = user !== null && user.activo;
  const passwordMatches = await bcrypt.compare(input.password, vigente ? user.passwordHash : HASH_FICTICIO);
  if (!vigente || !passwordMatches) {
    throw new AppError(401, "Credenciales inválidas");
  }

  const payload: TokenPayload = { id: user.id, tv: user.tokenVersion };
  const token = jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  } as SignOptions);

  await registrarAuditoria(prisma, { userId: user.id, ip }, {
    tabla: "usuario",
    idRegistro: user.id,
    accion: "LOGIN",
    despues: { login: user.login, rol: user.rol.nombre },
  });

  return { token, ...sesion(user) };
}

/** Datos actuales del usuario autenticado, para refrescar la sesión del frontend. */
export async function me(userId: number) {
  const user = await prisma.usuario.findUnique({
    where: { id: userId },
    include: usuarioConPermisos,
  });
  if (!user || !user.activo) {
    throw new AppError(401, "La sesión ya no es válida; inicia sesión de nuevo");
  }
  return sesion(user);
}
