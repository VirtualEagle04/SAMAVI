import { describe, it, expect } from "vitest";
import { parseCambioGallinasInput, parseId } from "../../../src/modules/galpones/galpones.schemas.js";
import { AppError } from "../../../src/shared/errors/app-error.js";

function expectAppError(fn: () => unknown, status: number, msgPart: string) {
  let err: unknown;
  try {
    fn();
  } catch (e) {
    err = e;
  }
  expect(err).toBeInstanceOf(AppError);
  expect((err as AppError).statusCode).toBe(status);
  expect((err as AppError).message).toContain(msgPart);
}

describe("parseId", () => {
  it("returns the numeric id", () => {
    expect(parseId("7", "id")).toBe(7);
  });

  it.each([undefined, "", "  ", "abc", "0", "-3", "1.5"])("throws 400 for %s", (value) => {
    expectAppError(() => parseId(value, "id"), 400, "id");
  });
});

describe("parseCambioGallinasInput", () => {
  it.each([null, 42, "texto", []])("throws 400 when body is %s", (body) => {
    expectAppError(() => parseCambioGallinasInput(body), 400, "inválido");
  });

  it.each([undefined, "otro", 1])("throws 400 when tipo is %s", (tipo) => {
    expectAppError(() => parseCambioGallinasInput({ tipo, cantidad: 5 }), 400, "tipo");
  });

  it.each([undefined, 0, -2, 1.5, "10"])("throws 400 when cantidad is %s", (cantidad) => {
    expectAppError(() => parseCambioGallinasInput({ tipo: "ingreso", cantidad }), 400, "cantidad");
  });

  it("accepts an ingreso without causa", () => {
    expect(parseCambioGallinasInput({ tipo: "ingreso", cantidad: 100 })).toEqual({ tipo: "ingreso", cantidad: 100 });
  });

  it("keeps an optional causa on ingreso, trimmed", () => {
    expect(parseCambioGallinasInput({ tipo: "ingreso", cantidad: 10, causa: "  Lote nuevo " })).toEqual({
      tipo: "ingreso",
      cantidad: 10,
      causa: "Lote nuevo",
    });
  });

  it.each([undefined, null, "", "   "])("requires causa on baja when it is %s", (causa) => {
    expectAppError(() => parseCambioGallinasInput({ tipo: "baja", cantidad: 3, causa }), 400, "causa");
  });

  it("accepts a baja with causa", () => {
    expect(parseCambioGallinasInput({ tipo: "baja", cantidad: 3, causa: "Enfermedad" })).toEqual({
      tipo: "baja",
      cantidad: 3,
      causa: "Enfermedad",
    });
  });

  it("rejects non-string causa and causa longer than 200", () => {
    expectAppError(() => parseCambioGallinasInput({ tipo: "baja", cantidad: 1, causa: 5 }), 400, "causa");
    expectAppError(() => parseCambioGallinasInput({ tipo: "baja", cantidad: 1, causa: "x".repeat(201) }), 400, "200");
  });
});
