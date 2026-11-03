import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import { login, me } from "../../../src/modules/auth/auth.service.js";
import { prisma } from "../../../src/database/prisma.js";
import bcrypt from "bcryptjs";
import { AppError } from "../../../src/shared/errors/app-error.js";

vi.mock("../../../src/database/prisma.js", () => ({
  prisma: { usuario: { findUnique: vi.fn() } },
}));

vi.mock("bcryptjs", () => ({
  default: { compare: vi.fn() },
}));

vi.mock("jsonwebtoken", () => ({
  default: { sign: vi.fn(), verify: vi.fn() },
}));

// Mockeado para evitar que falle por variables de entorno faltantes al importar env.ts
vi.mock("../../../src/config/env.js", () => ({
  env: {
    jwtSecret: "secreto-de-prueba-con-mas-de-32-caracteres-ok",
    jwtExpiresIn: "1h",
  },
}));

type UsuarioConRol = {
  id: number;
  nombre: string;
  login: string;
  passwordHash: string;
  activo: boolean;
  tokenVersion: number;
  rol: {
    id: number;
    nombre: string;
    permisos: { permiso: { codigo: string } }[];
  };
};

function makeUsuario(overrides: Partial<UsuarioConRol> = {}): UsuarioConRol {
  return {
    id: 1,
    nombre: "Ana García",
    login: "ana",
    passwordHash: "$2a$10$hashficticio",
    activo: true,
    tokenVersion: 4,
    rol: {
      id: 2,
      nombre: "Operador",
      permisos: [
        { permiso: { codigo: "produccion.ver" } },
        { permiso: { codigo: "produccion.editar" } },
      ],
    },
    ...overrides,
  };
}

const mockFindUnique = prisma.usuario.findUnique as ReturnType<typeof vi.fn>;
const mockBcryptCompare = bcrypt.compare as ReturnType<typeof vi.fn>;
const mockJwtSign = jwt.sign as ReturnType<typeof vi.fn>;

describe("auth.service → login()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockJwtSign.mockReturnValue("token.ficticio.jwt");
  });

  describe("cuando las credenciales son correctas", () => {
    it("retorna token, datos del usuario y lista de permisos", async () => {
      mockFindUnique.mockResolvedValue(makeUsuario());
      mockBcryptCompare.mockResolvedValue(true);

      const result = await login({ login: "ana", password: "1234" });

      expect(result).toEqual({
        token: "token.ficticio.jwt",
        user: {
          id: 1,
          nombre: "Ana García",
          login: "ana",
          rol: "Operador",
          permisos: ["produccion.ver", "produccion.editar"],
        },
        permissions: ["produccion.ver", "produccion.editar"],
      });
    });

    it("firma el JWT con payload { id, tv } usando la token_version actual", async () => {
      mockFindUnique.mockResolvedValue(makeUsuario());
      mockBcryptCompare.mockResolvedValue(true);

      await login({ login: "ana", password: "1234" });

      expect(mockJwtSign).toHaveBeenCalledWith(
        { id: 1, tv: 4 },
        expect.any(String),
        expect.objectContaining({ expiresIn: "1h" })
      );
    });

    it("busca al usuario por el campo 'login' en la base de datos", async () => {
      mockFindUnique.mockResolvedValue(makeUsuario());
      mockBcryptCompare.mockResolvedValue(true);

      await login({ login: "ana", password: "1234" });

      expect(mockFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { login: "ana" } })
      );
    });

    it("mapea correctamente un rol sin permisos", async () => {
      mockFindUnique.mockResolvedValue(
        makeUsuario({ rol: { id: 3, nombre: "Invitado", permisos: [] } })
      );
      mockBcryptCompare.mockResolvedValue(true);

      const result = await login({ login: "ana", password: "1234" });

      expect(result.permissions).toEqual([]);
      expect(result.user.permisos).toEqual([]);
    });
  });

  describe("cuando el usuario no existe en la base de datos", () => {
    it("lanza AppError 401", async () => {
      mockFindUnique.mockResolvedValue(null);
      mockBcryptCompare.mockResolvedValue(false);

      await expect(login({ login: "noexiste", password: "1234" })).rejects.toThrow(
        new AppError(401, "Credenciales inválidas")
      );
    });

    it("no llama a jwt.sign", async () => {
      mockFindUnique.mockResolvedValue(null);
      mockBcryptCompare.mockResolvedValue(false);

      await expect(login({ login: "noexiste", password: "1234" })).rejects.toThrow(AppError);
      expect(mockJwtSign).not.toHaveBeenCalled();
    });
  });

  describe("cuando la password es incorrecta", () => {
    it("lanza AppError 401", async () => {
      mockFindUnique.mockResolvedValue(makeUsuario());
      mockBcryptCompare.mockResolvedValue(false);

      await expect(login({ login: "ana", password: "wrongpass" })).rejects.toThrow(
        new AppError(401, "Credenciales inválidas")
      );
    });

    it("no llama a jwt.sign", async () => {
      mockFindUnique.mockResolvedValue(makeUsuario());
      mockBcryptCompare.mockResolvedValue(false);

      await expect(login({ login: "ana", password: "wrongpass" })).rejects.toThrow(AppError);
      expect(mockJwtSign).not.toHaveBeenCalled();
    });

    it("compara la password contra el hash almacenado del usuario", async () => {
      mockFindUnique.mockResolvedValue(makeUsuario({ passwordHash: "$2a$10$hash-del-usuario" }));
      mockBcryptCompare.mockResolvedValue(false);

      await expect(login({ login: "ana", password: "cualquiera" })).rejects.toThrow(AppError);
      expect(mockBcryptCompare).toHaveBeenCalledWith("cualquiera", "$2a$10$hash-del-usuario");
    });
  });

  describe("cuando el usuario está inactivo", () => {
    it("lanza el mismo AppError 401 genérico aunque la password sea correcta", async () => {
      mockFindUnique.mockResolvedValue(makeUsuario({ activo: false }));
      mockBcryptCompare.mockResolvedValue(true);

      await expect(login({ login: "ana", password: "1234" })).rejects.toThrow(
        new AppError(401, "Credenciales inválidas")
      );
      expect(mockJwtSign).not.toHaveBeenCalled();
    });

    it("compara contra el hash ficticio, no contra el del usuario", async () => {
      mockFindUnique.mockResolvedValue(makeUsuario({ activo: false, passwordHash: "$2a$10$hash-del-usuario" }));
      mockBcryptCompare.mockResolvedValue(true);

      await expect(login({ login: "ana", password: "1234" })).rejects.toThrow(AppError);
      expect(mockBcryptCompare).toHaveBeenCalledWith("1234", expect.not.stringMatching("hash-del-usuario"));
    });
  });

  // Evita que el tiempo de respuesta revele qué logins existen.
  describe("comportamiento timing", () => {
    it("llama a bcrypt.compare contra un hash ficticio cuando el usuario no existe", async () => {
      mockFindUnique.mockResolvedValue(null);
      mockBcryptCompare.mockResolvedValue(true);

      await expect(login({ login: "noexiste", password: "1234" })).rejects.toThrow(
        new AppError(401, "Credenciales inválidas")
      );
      expect(mockBcryptCompare).toHaveBeenCalledTimes(1);
      expect(mockBcryptCompare).toHaveBeenCalledWith("1234", expect.stringMatching(/^\$2[ab]\$12\$/));
    });
  });
});

describe("auth.service → me()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devuelve los datos y permisos actuales sin token", async () => {
    mockFindUnique.mockResolvedValue(makeUsuario());

    const result = await me(1);

    expect(result).toEqual({
      user: {
        id: 1,
        nombre: "Ana García",
        login: "ana",
        rol: "Operador",
        permisos: ["produccion.ver", "produccion.editar"],
      },
      permissions: ["produccion.ver", "produccion.editar"],
    });
    expect(result).not.toHaveProperty("token");
  });

  it.each([null, makeUsuario({ activo: false })])("lanza 401 si el usuario no existe o está inactivo", async (usuario) => {
    mockFindUnique.mockResolvedValue(usuario);
    await expect(me(1)).rejects.toThrow(expect.objectContaining({ statusCode: 401 }));
  });
});
