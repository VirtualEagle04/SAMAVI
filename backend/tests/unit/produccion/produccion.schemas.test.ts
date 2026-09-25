import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  parseProductionCountInput,
  parseDailyCloseInput,
} from "../../../src/modules/produccion/produccion.schemas.js";
import { AppError } from "../../../src/shared/errors/app-error.js";

// ── parseProductionCountInput ─────────────────────────────────────────────────

describe("parseProductionCountInput", () => {
  const validBase = {
    galponId: 1,
    categoriaPeso: "pesado",
    cantidad: 1 as const,
    timestamp: "2024-01-15T10:00:00.000Z",
  };

  it("throws when body is not an object", () => {
    for (const body of [null, 42, "string", true, undefined]) {
      expect(() => parseProductionCountInput(body)).toThrow(AppError);
      expect(() => parseProductionCountInput(body)).toThrow("El cuerpo del conteo es inválido");
    }
  });

  // galponId validation
  it.each([
    [{ ...validBase, galponId: undefined }, "galponId debe ser un entero positivo"],
    [{ ...validBase, galponId: "1" }, "galponId debe ser un entero positivo"],
    [{ ...validBase, galponId: 1.5 }, "galponId debe ser un entero positivo"],
    [{ ...validBase, galponId: 0 }, "galponId debe ser un entero positivo"],
    [{ ...validBase, galponId: -1 }, "galponId debe ser un entero positivo"],
  ])("throws for invalid galponId: %o", (body, message) => {
    expect(() => parseProductionCountInput(body)).toThrow(message);
  });

  // categoriaPeso validation
  it.each([
    [{ ...validBase, categoriaPeso: undefined }, "categoriaPeso es obligatoria"],
    [{ ...validBase, categoriaPeso: 123 }, "categoriaPeso es obligatoria"],
    [{ ...validBase, categoriaPeso: "" }, "categoriaPeso es obligatoria"],
    [{ ...validBase, categoriaPeso: "   " }, "categoriaPeso es obligatoria"],
  ])("throws for invalid categoriaPeso: %o", (body, message) => {
    expect(() => parseProductionCountInput(body)).toThrow(message);
  });

  // cantidad validation
  it.each([
    [{ ...validBase, cantidad: 0 }, "cantidad debe ser 1 o -1"],
    [{ ...validBase, cantidad: 2 }, "cantidad debe ser 1 o -1"],
    [{ ...validBase, cantidad: -2 }, "cantidad debe ser 1 o -1"],
    [{ ...validBase, cantidad: "1" }, "cantidad debe ser 1 o -1"],
    [{ ...validBase, cantidad: null }, "cantidad debe ser 1 o -1"],
  ])("throws for invalid cantidad: %o", (body, message) => {
    expect(() => parseProductionCountInput(body)).toThrow(message);
  });

  it("throws for an invalid timestamp string", () => {
    expect(() =>
      parseProductionCountInput({ ...validBase, timestamp: "not-a-date" })
    ).toThrow("timestamp inválido");
  });

  it("returns a valid result with an explicit ISO timestamp", () => {
    const result = parseProductionCountInput(validBase);
    expect(result.galponId).toBe(1);
    expect(result.categoriaPeso).toBe("pesado");
    expect(result.cantidad).toBe(1);
    expect(result.timestamp).toEqual(new Date("2024-01-15T10:00:00.000Z"));
  });

  it("trims whitespace from categoriaPeso", () => {
    const result = parseProductionCountInput({ ...validBase, categoriaPeso: "  liviano  " });
    expect(result.categoriaPeso).toBe("liviano");
  });

  it("uses the current date when timestamp is undefined", () => {
    const before = Date.now();
    const result = parseProductionCountInput({ ...validBase, timestamp: undefined });
    const after = Date.now();
    expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.timestamp.getTime()).toBeLessThanOrEqual(after);
  });

  it("accepts cantidad -1", () => {
    const result = parseProductionCountInput({ ...validBase, cantidad: -1 });
    expect(result.cantidad).toBe(-1);
  });
});

// ── parseDailyCloseInput ──────────────────────────────────────────────────────

describe("parseDailyCloseInput", () => {
  it("throws when body is not an object", () => {
    for (const body of [null, 42, "string", true, undefined]) {
      expect(() => parseDailyCloseInput(body)).toThrow(AppError);
      expect(() => parseDailyCloseInput(body)).toThrow("fecha debe tener el formato YYYY-MM-DD");
    }
  });

  // fecha format validation
  it.each([
    [{ fecha: undefined }, "fecha debe tener el formato YYYY-MM-DD"],
    [{ fecha: 20260925 }, "fecha debe tener el formato YYYY-MM-DD"],
    [{ fecha: "25-09-2026" }, "fecha debe tener el formato YYYY-MM-DD"],
    [{ fecha: "2026-9-5" }, "fecha debe tener el formato YYYY-MM-DD"],
    [{ fecha: "2026/09/25" }, "fecha debe tener el formato YYYY-MM-DD"],
  ])("throws for invalid fecha format: %o", (body, message) => {
    expect(() => parseDailyCloseInput(body)).toThrow(message);
  });

  it("throws for a structurally valid but calendrically invalid date", () => {
    // February 30 passes the regex but is not a real date
    expect(() => parseDailyCloseInput({ fecha: "2026-02-30" })).toThrow("fecha inválida");
  });

  it("returns only fecha when galponId is omitted", () => {
    const result = parseDailyCloseInput({ fecha: "2026-09-25" });
    expect(result).toEqual({ fecha: "2026-09-25" });
    expect("galponId" in result).toBe(false);
  });

  it("returns fecha and galponId when galponId is a valid positive integer", () => {
    const result = parseDailyCloseInput({ fecha: "2026-09-25", galponId: 3 });
    expect(result).toEqual({ fecha: "2026-09-25", galponId: 3 });
  });

  // galponId present but invalid
  it.each([
    [{ fecha: "2026-09-25", galponId: 1.5 }, "galponId debe ser un entero positivo"],
    [{ fecha: "2026-09-25", galponId: 0 }, "galponId debe ser un entero positivo"],
    [{ fecha: "2026-09-25", galponId: -3 }, "galponId debe ser un entero positivo"],
    [{ fecha: "2026-09-25", galponId: "1" }, "galponId debe ser un entero positivo"],
  ])("throws for invalid galponId: %o", (body, message) => {
    expect(() => parseDailyCloseInput(body)).toThrow(message);
  });
});
