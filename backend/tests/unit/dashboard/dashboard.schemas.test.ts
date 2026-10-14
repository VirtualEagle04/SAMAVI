import { describe, it, expect } from "vitest";
import { parseWeeklySummaryQuery } from "../../../src/modules/dashboard/dashboard.schemas.js";
import { AppError } from "../../../src/shared/errors/app-error.js";

describe("parseWeeklySummaryQuery", () => {
  it("devuelve una consulta vacía cuando falta desde o viene vacío", () => {
    expect(parseWeeklySummaryQuery({})).toEqual({});
    expect(parseWeeklySummaryQuery({ desde: "" })).toEqual({});
    expect(parseWeeklySummaryQuery(undefined)).toEqual({});
  });

  it("acepta una fecha YYYY-MM-DD válida", () => {
    expect(parseWeeklySummaryQuery({ desde: "2026-08-07" })).toEqual({ desde: "2026-08-07" });
  });

  it("rechaza fechas mal formadas o imposibles", () => {
    for (const desde of ["07/08/2026", "2026-8-7", "2026-02-30", ["2026-08-07"]]) {
      expect(() => parseWeeklySummaryQuery({ desde })).toThrow(AppError);
    }
  });
});
