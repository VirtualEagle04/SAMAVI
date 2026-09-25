import { vi, describe, it, expect } from "vitest";
import {
  parseMayoristaInput,
  parsePrecioInput,
  parsePedidoInput,
  parseVentaInput,
  parseId,
  parseEstado,
} from "../../../src/modules/comercial/comercial.schemas.js";
import { AppError } from "../../../src/shared/errors/app-error.js";

vi.mock("@prisma/client", () => ({ Prisma: {} }));

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

describe("parseMayoristaInput", () => {
  it.each([null, 42, "string", []])("throws 400 when body is %s (non-object)", (body) => {
    expectAppError(() => parseMayoristaInput(body), 400, "inválido");
  });

  it.each([undefined, "", "   "])(
    "throws 400 when nombre is %s (missing/empty/whitespace)",
    (nombre) => {
      expectAppError(() => parseMayoristaInput({ nombre }), 400, "nombre");
    },
  );

  it("returns result without ubicacion when ubicacion is undefined", () => {
    const result = parseMayoristaInput({ nombre: "Acme" });
    expect(result).toEqual({ nombre: "Acme" });
    expect(result).not.toHaveProperty("ubicacion");
  });

  it("returns ubicacion when present and valid", () => {
    const result = parseMayoristaInput({ nombre: "Acme", ubicacion: "  Córdoba  " });
    expect(result.ubicacion).toBe("Córdoba");
  });

  it("throws 400 when ubicacion is an empty string", () => {
    expectAppError(() => parseMayoristaInput({ nombre: "Acme", ubicacion: "" }), 400, "ubicacion");
  });

  it("returns result without contacto when contacto is undefined", () => {
    const result = parseMayoristaInput({ nombre: "Acme" });
    expect(result).not.toHaveProperty("contacto");
  });

  it("returns contacto when it is a valid object", () => {
    const result = parseMayoristaInput({ nombre: "Acme", contacto: { tel: "123" } });
    expect(result.contacto).toEqual({ tel: "123" });
  });

  it.each(["string-contact", 99, [1, 2]])(
    "throws 400 when contacto is a primitive/array (%s)",
    (contacto) => {
      expectAppError(() => parseMayoristaInput({ nombre: "Acme", contacto }), 400, "contacto");
    },
  );
});

describe("parsePrecioInput", () => {
  it.each([null, 42, "string", []])("throws 400 when body is non-object (%s)", (body) => {
    expectAppError(() => parsePrecioInput(body), 400, "inválido");
  });

  it.each([undefined, "", "   "])(
    "throws 400 when categoriaPeso is %s",
    (categoriaPeso) => {
      expectAppError(() => parsePrecioInput({ categoriaPeso, valorUnitario: 10 }), 400, "categoriaPeso");
    },
  );

  it.each([0, -5, Infinity, NaN, "10"])(
    "throws 400 when valorUnitario is %s (invalid)",
    (valorUnitario) => {
      expectAppError(
        () => parsePrecioInput({ categoriaPeso: "kg1", valorUnitario }),
        400,
        "valorUnitario",
      );
    },
  );

  it("returns valid PrecioInput", () => {
    expect(parsePrecioInput({ categoriaPeso: "kg1", valorUnitario: 5.5 })).toEqual({
      categoriaPeso: "kg1",
      valorUnitario: 5.5,
    });
  });
});

describe("parsePedidoInput", () => {
  it.each([null, 42, "string", []])("throws 400 when body is non-object (%s)", (body) => {
    expectAppError(() => parsePedidoInput(body), 400, "inválido");
  });

  it.each([0, -1, 1.5, "3", null])("throws 400 when mayoristaId is %s (invalid)", (mayoristaId) => {
    expectAppError(
      () => parsePedidoInput({ mayoristaId, detalles: [{ categoriaPeso: "k1", cantidadSolicitada: 2 }] }),
      400,
      "mayoristaId",
    );
  });

  it("throws 400 when detalles is not an array", () => {
    expectAppError(() => parsePedidoInput({ mayoristaId: 1, detalles: "bad" }), 400, "detalles");
  });

  it("throws 400 when detalles is an empty array", () => {
    expectAppError(() => parsePedidoInput({ mayoristaId: 1, detalles: [] }), 400, "detalles");
  });

  it("throws 400 when a detalles item is not an object", () => {
    expectAppError(
      () => parsePedidoInput({ mayoristaId: 1, detalles: [42] }),
      400,
      "detalles[0]",
    );
  });

  it("throws 400 when categoriaPeso is repeated", () => {
    expectAppError(
      () =>
        parsePedidoInput({
          mayoristaId: 1,
          detalles: [
            { categoriaPeso: "k1", cantidadSolicitada: 1 },
            { categoriaPeso: "k1", cantidadSolicitada: 2 },
          ],
        }),
      400,
      "repetida",
    );
  });

  it.each([1.5, 0, -3])("throws 400 when cantidadSolicitada is %s (float/zero/negative)", (cantidadSolicitada) => {
    expectAppError(
      () => parsePedidoInput({ mayoristaId: 1, detalles: [{ categoriaPeso: "k1", cantidadSolicitada }] }),
      400,
      "cantidadSolicitada",
    );
  });

  it("returns valid PedidoInput", () => {
    const result = parsePedidoInput({
      mayoristaId: 2,
      detalles: [{ categoriaPeso: "k1", cantidadSolicitada: 5 }],
    });
    expect(result).toEqual({ mayoristaId: 2, detalles: [{ categoriaPeso: "k1", cantidadSolicitada: 5 }] });
  });
});

describe("parseVentaInput", () => {
  const validDistribucion = [{ galponId: 1, categoriaPeso: "k1", cantidad: 3 }];
  const validDetalles = [{ categoriaPeso: "k1", cantidadVendida: 2 }];

  it.each([null, 42, "string", []])("throws 400 when body is non-object (%s)", (body) => {
    expectAppError(() => parseVentaInput(body), 400, "inválido");
  });

  it("throws 400 when detalles is empty", () => {
    expectAppError(() => parseVentaInput({ detalles: [], distribucion: validDistribucion }), 400, "detalles");
  });

  it("throws 400 when detalles categoriaPeso is repeated", () => {
    expectAppError(
      () =>
        parseVentaInput({
          detalles: [
            { categoriaPeso: "k1", cantidadVendida: 1 },
            { categoriaPeso: "k1", cantidadVendida: 2 },
          ],
          distribucion: validDistribucion,
        }),
      400,
      "repetida",
    );
  });

  it("throws 400 when distribucion is not an array", () => {
    expectAppError(() => parseVentaInput({ detalles: validDetalles, distribucion: "bad" }), 400, "distribucion");
  });

  it("throws 400 when distribucion is empty", () => {
    expectAppError(() => parseVentaInput({ detalles: validDetalles, distribucion: [] }), 400, "distribucion");
  });

  it("throws 400 when a distribucion item is not an object", () => {
    expectAppError(
      () => parseVentaInput({ detalles: validDetalles, distribucion: [42] }),
      400,
      "distribucion[0]",
    );
  });

  it.each([0, -1, 1.5])("throws 400 when distribucion[i].galponId is %s", (galponId) => {
    expectAppError(
      () => parseVentaInput({ detalles: validDetalles, distribucion: [{ galponId, categoriaPeso: "k1", cantidad: 1 }] }),
      400,
      "galponId",
    );
  });

  it.each([0, -1, 1.5])("throws 400 when distribucion[i].cantidad is %s", (cantidad) => {
    expectAppError(
      () => parseVentaInput({ detalles: validDetalles, distribucion: [{ galponId: 1, categoriaPeso: "k1", cantidad }] }),
      400,
      "cantidad",
    );
  });

  it.each([undefined, "", "   "])("throws 400 when distribucion[i].categoriaPeso is %s", (categoriaPeso) => {
    expectAppError(
      () => parseVentaInput({ detalles: validDetalles, distribucion: [{ galponId: 1, categoriaPeso, cantidad: 1 }] }),
      400,
      "categoriaPeso",
    );
  });

  it("returns valid VentaInput", () => {
    const result = parseVentaInput({ detalles: validDetalles, distribucion: validDistribucion });
    expect(result).toEqual({
      detalles: [{ categoriaPeso: "k1", cantidadVendida: 2 }],
      distribucion: [{ galponId: 1, categoriaPeso: "k1", cantidad: 3 }],
    });
  });
});

describe("parseId", () => {
  it.each([42, null, undefined, {}])("throws 400 when value is non-string (%s)", (value) => {
    expectAppError(() => parseId(value, "id"), 400, "id");
  });

  it("throws 400 when value is empty string", () => {
    expectAppError(() => parseId("", "id"), 400, "id");
  });

  it.each(["0", "-1"])("throws 400 when value is %s (non-positive integer string)", (value) => {
    expectAppError(() => parseId(value, "id"), 400, "id");
  });

  it("throws 400 when value is 'abc' (NaN after Number())", () => {
    expectAppError(() => parseId("abc", "id"), 400, "id");
  });

  it("returns 5 when value is '5'", () => {
    expect(parseId("5", "id")).toBe(5);
  });
});

describe("parseEstado", () => {
  it.each(["pendiente", null, 42])("throws 400 for invalid estado value (%s)", (value) => {
    expectAppError(() => parseEstado(value), 400, "estado");
  });

  it.each(["cargado", "entregado", "cancelado"] as const)("accepts valid estado '%s'", (estado) => {
    expect(parseEstado(estado)).toBe(estado);
  });
});
