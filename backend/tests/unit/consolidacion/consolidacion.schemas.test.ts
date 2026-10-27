import { describe, it, expect } from "vitest";
import { parseDesde, parseGastoInput, parseHistorialQuery } from "../../../src/modules/consolidacion/consolidacion.schemas.js";

const gastoValido = { concepto: " Chana ", valor: 240000, fecha: "2026-08-13", galponIds: [1, 3] };

describe("parseDesde", () => {
  it("acepta un viernes", () => {
    expect(parseDesde("2026-08-07")).toBe("2026-08-07");
  });

  it("rechaza otro día de la semana", () => {
    expect(() => parseDesde("2026-08-13")).toThrow("desde debe ser un viernes");
  });

  it("rechaza fechas mal formadas o inexistentes", () => {
    expect(() => parseDesde("2026-8-7")).toThrow("desde debe tener el formato YYYY-MM-DD");
    expect(() => parseDesde("2026-02-30")).toThrow("desde es una fecha inválida");
    expect(() => parseDesde(undefined)).toThrow("desde debe tener el formato YYYY-MM-DD");
  });
});

describe("parseGastoInput", () => {
  it("normaliza un gasto válido", () => {
    expect(parseGastoInput(gastoValido)).toEqual({ concepto: "Chana", valor: 240000, fecha: "2026-08-13", galponIds: [1, 3] });
  });

  it("acepta valores con dos decimales", () => {
    expect(parseGastoInput({ ...gastoValido, valor: 0.29 }).valor).toBe(0.29);
  });

  it("rechaza valores inválidos", () => {
    expect(() => parseGastoInput({ ...gastoValido, valor: 0 })).toThrow("valor debe ser un número positivo");
    expect(() => parseGastoInput({ ...gastoValido, valor: 1.234 })).toThrow("valor debe tener máximo dos decimales");
  });

  it("exige al menos un galpón sin repetir", () => {
    expect(() => parseGastoInput({ ...gastoValido, galponIds: [] })).toThrow("galponIds debe incluir al menos un galpón");
    expect(() => parseGastoInput({ ...gastoValido, galponIds: [1, 1] })).toThrow("galponIds no puede repetir galpones");
    expect(() => parseGastoInput({ ...gastoValido, galponIds: [0] })).toThrow("galponIds[0] debe ser un entero positivo");
  });

  it("exige concepto y fecha", () => {
    expect(() => parseGastoInput({ ...gastoValido, concepto: "  " })).toThrow("concepto es obligatorio");
    expect(() => parseGastoInput({ ...gastoValido, fecha: "13/08/2026" })).toThrow("fecha debe tener el formato YYYY-MM-DD");
  });
});

describe("parseHistorialQuery", () => {
  it("usa 8 semanas por defecto", () => {
    expect(parseHistorialQuery({ hasta: "2026-08-13" })).toEqual({ hasta: "2026-08-13", semanas: 8 });
    expect(parseHistorialQuery({ hasta: "2026-08-13", semanas: "12" })).toEqual({ hasta: "2026-08-13", semanas: 12 });
  });

  it("rechaza una fecha inválida o una cantidad de semanas fuera de rango", () => {
    expect(() => parseHistorialQuery({})).toThrow("hasta debe tener el formato YYYY-MM-DD");
    expect(() => parseHistorialQuery({ hasta: "2026-08-13", semanas: "0" })).toThrow("semanas debe ser un entero entre 1 y 26");
    expect(() => parseHistorialQuery({ hasta: "2026-08-13", semanas: "27" })).toThrow("semanas debe ser un entero entre 1 y 26");
  });
});
