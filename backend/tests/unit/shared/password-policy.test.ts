import { describe, it, expect } from "vitest";
import { parsePassword } from "../../../src/shared/security/password-policy.js";
import type { AppError } from "../../../src/shared/errors/app-error.js";

function error(fn: () => unknown): AppError {
  try {
    fn();
  } catch (caught) {
    return caught as AppError;
  }
  throw new Error("Expected function to throw");
}

describe("parsePassword", () => {
  it("acepta una frase de 12 caracteres o más, con espacios y Unicode", () => {
    expect(parsePassword("gallinas en el patio", "ana")).toBe("gallinas en el patio");
    expect(parsePassword("ñandú corre rápido", "ana")).toBe("ñandú corre rápido");
  });

  it("no exige mayúsculas, números ni símbolos", () => {
    expect(parsePassword("ninguna regla rara", "ana")).toBe("ninguna regla rara");
  });

  it.each([undefined, null, 123, ""])("rechaza %s", (value) => {
    expect(error(() => parsePassword(value, "ana")).statusCode).toBe(400);
  });

  it("rechaza menos de 12 caracteres", () => {
    const caught = error(() => parsePassword("corta12345!", "ana"));
    expect(caught.statusCode).toBe(400);
    expect(caught.message).toContain("12");
  });

  it("cuenta caracteres, no bytes, para el mínimo", () => {
    // 12 caracteres, 24 bytes.
    expect(parsePassword("ñóéáíúñóéáíú", "ana")).toBe("ñóéáíúñóéáíú");
  });

  it("rechaza más de 72 bytes aunque tenga menos de 72 caracteres", () => {
    const multibyte = "ñ".repeat(37); // 74 bytes
    expect(error(() => parsePassword(multibyte, "ana")).message).toContain("72 bytes");
    expect(parsePassword("x".repeat(36) + "y".repeat(36), "ana")).toHaveLength(72);
  });

  it("rechaza una contraseña que contiene el login", () => {
    expect(error(() => parsePassword("soyCarolina2026", "carolina")).message).toContain("login");
  });

  it("rechaza un solo carácter repetido", () => {
    expect(error(() => parsePassword("aaaaaaaaaaaaaa", "ana")).statusCode).toBe(400);
  });

  it.each(["contraseña123456", "Password1234", "QWERTY123456", "samavi123456"])(
    "rechaza la contraseña común %s sin importar mayúsculas",
    (value) => {
      expect(error(() => parsePassword(value, "ana")).message).toContain("común");
    },
  );
});
