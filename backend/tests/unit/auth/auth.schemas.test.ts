import { describe, it, expect } from "vitest";
import { parseLoginInput } from "../../../src/modules/auth/auth.schemas.js";
import { AppError } from "../../../src/shared/errors/app-error.js";

describe("auth.schemas → parseLoginInput()", () => {
  describe("cuando el input es válido", () => {
    it("retorna login y password correctamente", () => {
      expect(parseLoginInput({ login: "ana", password: "1234" })).toEqual({
        login: "ana",
        password: "1234",
      });
    });

    it("recorta espacios del login", () => {
      expect(parseLoginInput({ login: "  ana  ", password: "1234" })).toEqual({
        login: "ana",
        password: "1234",
      });
    });

    it("no recorta espacios de la password", () => {
      const result = parseLoginInput({ login: "ana", password: "  clave  " });
      expect(result.password).toBe("  clave  ");
    });
  });

  describe("cuando el body no tiene la forma esperada", () => {
    // null y primitivos son rechazados por la primera guarda del schema
    it.each([null, undefined, "string", 42, true])(
      "lanza AppError 400 si el body es %s",
      (body) => {
        expect(() => parseLoginInput(body)).toThrow(new AppError(400, "El cuerpo de la solicitud es inválido"));
      }
    );

    // [] es typeof "object" en JS, cae en la guarda de campos obligatorios
    it("lanza AppError 400 si el body es un array", () => {
      expect(() => parseLoginInput([])).toThrow(new AppError(400, "login y password son obligatorios"));
    });
  });

  describe("cuando faltan campos o tienen valores inválidos", () => {
    it.each([
      { login: "", password: "1234" },
      { login: "   ", password: "1234" },
      { login: 123, password: "1234" },
      { login: "ana", password: "" },
      { login: "ana", password: 123 },
      { password: "1234" },
      { login: "ana" },
      {},
    ])("lanza AppError 400 con body %j", (body) => {
      expect(() => parseLoginInput(body)).toThrow(new AppError(400, "login y password son obligatorios"));
    });

    it("ignora propiedades extra en el body sin lanzar error", () => {
      expect(() =>
        parseLoginInput({ login: "ana", password: "1234", extra: "ignorame" })
      ).not.toThrow();
    });
  });
});
