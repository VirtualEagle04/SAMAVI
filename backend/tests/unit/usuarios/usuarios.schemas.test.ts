import { describe, it, expect } from "vitest";
import {
  parseContacto,
  parseCrearUsuarioInput,
  parseDescripcionPermisoInput,
  parseEditarRolInput,
  parseEditarUsuarioInput,
  parseEstadoInput,
  parseId,
  parseLogin,
  parseRestablecerPasswordInput,
  parseRolInput,
} from "../../../src/modules/usuarios/usuarios.schemas.js";
import type { AppError } from "../../../src/shared/errors/app-error.js";

function error(fn: () => unknown): AppError {
  try {
    fn();
  } catch (caught) {
    return caught as AppError;
  }
  throw new Error("Expected function to throw");
}

const PASSWORD = "una frase bastante larga";

describe("parseLogin", () => {
  it("normaliza a minúsculas y quita espacios", () => {
    expect(parseLogin("  Ana.Perez ")).toBe("ana.perez");
  });

  it.each(["ab", "con espacio", "tildé", "a".repeat(51), 12])("rechaza %s", (value) => {
    expect(error(() => parseLogin(value)).statusCode).toBe(400);
  });
});

describe("parseContacto", () => {
  it("acepta teléfono y correo, y normaliza el correo", () => {
    expect(parseContacto({ telefono: " +57 311 000 0000 ", correo: "Ana@Ejemplo.COM" })).toEqual({
      telefono: "+57 311 000 0000",
      correo: "ana@ejemplo.com",
    });
  });

  it("devuelve null si no hay datos", () => {
    expect(parseContacto(undefined)).toBeNull();
    expect(parseContacto({ telefono: "", correo: null })).toBeNull();
  });

  it("descarta campos desconocidos", () => {
    expect(parseContacto({ telefono: "3110000000", extra: "x" })).toEqual({ telefono: "3110000000" });
  });

  it.each([{ telefono: "abc" }, { correo: "no-es-correo" }, "texto"])("rechaza %o", (value) => {
    expect(error(() => parseContacto(value)).statusCode).toBe(400);
  });
});

describe("parseCrearUsuarioInput", () => {
  it("valida todos los campos y aplica la política de contraseñas", () => {
    expect(parseCrearUsuarioInput({ nombre: "  Ana   Pérez ", login: "Ana", password: PASSWORD, idRol: 2 })).toEqual({
      nombre: "Ana Pérez",
      login: "ana",
      password: PASSWORD,
      contacto: null,
      idRol: 2,
    });
  });

  it("rechaza una contraseña débil", () => {
    expect(error(() => parseCrearUsuarioInput({ nombre: "Ana", login: "ana", password: "123", idRol: 2 })).statusCode).toBe(400);
  });

  it("rechaza una contraseña que contiene el login", () => {
    expect(error(() => parseCrearUsuarioInput({ nombre: "Ana", login: "carolina", password: "carolina en el galpón", idRol: 2 })).message)
      .toContain("login");
  });

  it.each([{ idRol: "2" }, { idRol: 0 }, { nombre: "" }])("rechaza %o", (cambio) => {
    expect(error(() => parseCrearUsuarioInput({ nombre: "Ana", login: "ana", password: PASSWORD, idRol: 2, ...cambio })).statusCode)
      .toBe(400);
  });
});

describe("parseEditarUsuarioInput", () => {
  it("devuelve solo los campos enviados", () => {
    expect(parseEditarUsuarioInput({ nombre: "Luis" })).toEqual({ nombre: "Luis" });
  });

  it("permite borrar el contacto con null", () => {
    expect(parseEditarUsuarioInput({ contacto: null })).toEqual({ contacto: null });
  });

  it("ignora la contraseña: se cambia por su propia ruta", () => {
    expect(error(() => parseEditarUsuarioInput({ password: PASSWORD })).message).toContain("No hay cambios");
  });
});

describe("parseRestablecerPasswordInput y parseEstadoInput", () => {
  it("exigen sus campos", () => {
    expect(parseRestablecerPasswordInput({ password: PASSWORD })).toEqual({ password: PASSWORD });
    expect(error(() => parseRestablecerPasswordInput({})).statusCode).toBe(400);
    expect(parseEstadoInput({ activo: false })).toEqual({ activo: false });
    expect(error(() => parseEstadoInput({ activo: "false" })).statusCode).toBe(400);
  });
});

describe("parseRolInput y parseEditarRolInput", () => {
  it("quita duplicados y ordena los permisos", () => {
    expect(parseRolInput({ nombre: "Supervisor", permisos: ["VER_PRODUCCION", "INGRESAR_GASTO", "VER_PRODUCCION"] })).toEqual({
      nombre: "Supervisor",
      permisos: ["INGRESAR_GASTO", "VER_PRODUCCION"],
    });
  });

  it("acepta un rol sin permisos", () => {
    expect(parseRolInput({ nombre: "Invitado", permisos: [] }).permisos).toEqual([]);
  });

  it.each([
    { nombre: "X", permisos: [] },
    { nombre: "Supervisor", permisos: "VER_PRODUCCION" },
    { nombre: "Supervisor", permisos: ["ver_produccion"] },
  ])("rechaza %o", (value) => {
    expect(error(() => parseRolInput(value)).statusCode).toBe(400);
  });

  it("exige algún cambio al editar", () => {
    expect(error(() => parseEditarRolInput({})).statusCode).toBe(400);
    expect(parseEditarRolInput({ nombre: "Bodega" })).toEqual({ nombre: "Bodega" });
  });
});

describe("parseDescripcionPermisoInput y parseId", () => {
  it("validan longitud y formato", () => {
    expect(parseDescripcionPermisoInput({ descripcion: " Ver producción " })).toEqual({ descripcion: "Ver producción" });
    expect(error(() => parseDescripcionPermisoInput({ descripcion: "x".repeat(151) })).statusCode).toBe(400);
    expect(parseId("12", "id")).toBe(12);
    expect(error(() => parseId("1.5", "id")).statusCode).toBe(400);
    expect(error(() => parseId("roles", "id")).statusCode).toBe(400);
  });
});
