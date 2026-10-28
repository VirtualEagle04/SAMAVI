import { describe, it, expect } from "vitest";
import { parseAuditoriaQuery } from "../../../src/modules/auditoria/auditoria.schemas.js";
import { AppError } from "../../../src/shared/errors/app-error.js";

describe("parseAuditoriaQuery", () => {
  it("usa la primera página y 25 filas cuando no hay filtros", () => {
    expect(parseAuditoriaQuery({})).toEqual({ page: 1, limit: 25 });
    expect(parseAuditoriaQuery(undefined)).toEqual({ page: 1, limit: 25 });
  });

  it("trata los valores vacíos como sin filtrar", () => {
    expect(parseAuditoriaQuery({ tabla: "", accion: "", usuarioId: "", registro: "  ", desde: "", hasta: "" }))
      .toEqual({ page: 1, limit: 25 });
  });

  it("acepta todos los filtros válidos", () => {
    expect(parseAuditoriaQuery({
      tabla: "pedido",
      accion: "UPDATE",
      usuarioId: "2",
      registro: "15",
      desde: "2026-10-01",
      hasta: "2026-10-27",
      page: "3",
      limit: "50",
    })).toEqual({
      tabla: "pedido",
      accion: "UPDATE",
      usuarioId: 2,
      registro: "15",
      desde: "2026-10-01",
      hasta: "2026-10-27",
      page: 3,
      limit: 50,
    });
  });

  it.each([
    [{ accion: "LOGIN" }],
    [{ usuarioId: "0" }],
    [{ usuarioId: "abc" }],
    [{ desde: "2026-02-30" }],
    [{ hasta: "27/10/2026" }],
    [{ desde: "2026-10-27", hasta: "2026-10-01" }],
    [{ limit: "101" }],
    [{ page: "-1" }],
    [{ tabla: ["pedido"] }],
    [{ tabla: "x".repeat(51) }],
  ])("rechaza %o", (query) => {
    expect(() => parseAuditoriaQuery(query)).toThrow(AppError);
  });
});
