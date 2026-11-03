import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { authenticate, requirePermission } from "../../../src/middleware/auth.middleware.js";
import { prisma } from "../../../src/database/prisma.js";
import type { AppError } from "../../../src/shared/errors/app-error.js";

vi.mock("../../../src/database/prisma.js", () => ({
  prisma: { usuario: { findUnique: vi.fn() } },
}));

vi.mock("jsonwebtoken", () => ({
  default: { verify: vi.fn() },
}));

vi.mock("../../../src/config/env.js", () => ({
  env: { jwtSecret: "secreto-de-prueba-con-mas-de-32-caracteres-ok" },
}));

const mockFindUnique = prisma.usuario.findUnique as ReturnType<typeof vi.fn>;
const mockVerify = jwt.verify as ReturnType<typeof vi.fn>;

function request(authorization?: string): Request {
  return { header: (name: string) => (name === "authorization" ? authorization : undefined) } as unknown as Request;
}

async function run(req: Request): Promise<AppError | undefined> {
  const next = vi.fn() as unknown as NextFunction & ReturnType<typeof vi.fn>;
  await authenticate(req, {} as Response, next);
  expect(next).toHaveBeenCalledTimes(1);
  return (next as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as AppError | undefined;
}

function usuario(overrides: Record<string, unknown> = {}) {
  return {
    activo: true,
    tokenVersion: 2,
    rol: {
      id: 7,
      nombre: "Supervisor",
      permisos: [{ permiso: { codigo: "VER_PRODUCCION" } }, { permiso: { codigo: "GESTIONAR_USUARIOS" } }],
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("authenticate", () => {
  it("rechaza sin token", async () => {
    expect((await run(request())).statusCode).toBe(401);
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it("rechaza un token con firma inválida o expirado", async () => {
    mockVerify.mockImplementation(() => {
      throw new Error("jwt expired");
    });
    expect((await run(request("Bearer x"))).statusCode).toBe(401);
  });

  it("rechaza tokens del formato anterior, sin tv", async () => {
    mockVerify.mockReturnValue({ id: 1, rol: "Administrador", rolId: 1 });
    expect((await run(request("Bearer x"))).statusCode).toBe(401);
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it.each([
    ["no existe", null],
    ["está inactivo", usuario({ activo: false })],
    ["cambió su token_version", usuario({ tokenVersion: 3 })],
  ])("rechaza si el usuario %s", async (_caso, encontrado) => {
    mockVerify.mockReturnValue({ id: 1, tv: 2 });
    mockFindUnique.mockResolvedValue(encontrado);
    const error = await run(request("Bearer x"));
    expect(error?.statusCode).toBe(401);
  });

  it("carga el rol y los permisos actuales desde la base", async () => {
    mockVerify.mockReturnValue({ id: 1, tv: 2 });
    mockFindUnique.mockResolvedValue(usuario());
    const req = request("Bearer x");

    expect(await run(req)).toBeUndefined();
    expect(req.auth).toEqual({
      id: 1,
      rol: "Supervisor",
      rolId: 7,
      permisos: new Set(["VER_PRODUCCION", "GESTIONAR_USUARIOS"]),
    });
    expect(mockFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 1 } }));
  });
});

describe("requirePermission", () => {
  function check(permisos: string[] | null, codigo: string): AppError | undefined {
    const next = vi.fn();
    const req = (permisos === null
      ? {}
      : { auth: { id: 1, rol: "X", rolId: 1, permisos: new Set(permisos) } }) as unknown as Request;
    requirePermission(codigo)(req, {} as Response, next as unknown as NextFunction);
    return next.mock.calls[0]?.[0] as AppError | undefined;
  }

  it("deja pasar si el rol tiene el permiso", () => {
    expect(check(["VER_PRODUCCION"], "VER_PRODUCCION")).toBeUndefined();
  });

  it("responde 403 si no lo tiene", () => {
    expect(check(["VER_PRODUCCION"], "GESTIONAR_USUARIOS")?.statusCode).toBe(403);
  });

  it("responde 401 si no hay sesión", () => {
    expect(check(null, "VER_PRODUCCION")?.statusCode).toBe(401);
  });
});
