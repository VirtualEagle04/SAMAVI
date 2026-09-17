import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../../config/env.js";
import { prisma } from "../../database/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";
import type { LoginInput } from "./auth.schemas.js";

export async function login(input: LoginInput) {
  const user = await prisma.usuario.findUnique({
    where: { login: input.login },
    include: { rol: true },
  });

  const passwordMatches = user ? await bcrypt.compare(input.password, user.passwordHash) : false;
  if (!user || !passwordMatches) {
    throw new AppError(401, "Credenciales inválidas");
  }

  const payload = { id: user.id, rol: user.rol.nombre };
  const token = jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  } as SignOptions);

  return {
    token,
    user: {
      id: user.id,
      nombre: user.nombre,
      login: user.login,
      rol: user.rol.nombre,
    },
  };
}