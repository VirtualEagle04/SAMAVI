import { describe, expect, it } from "vitest";
import {
  parseCompraInput,
  parseInsumoInput,
  parseInventarioFilters,
  parseMovimientoInput,
} from "../../../src/modules/inventario/inventario.schemas.js";
import { AppError } from "../../../src/shared/errors/app-error.js";

function expectBadInput(fn: () => unknown, field: string) {
  expect(fn).toThrow(AppError);
  try {
    fn();
  } catch (error) {
    expect(error).toMatchObject({ statusCode: 400 });
    expect((error as Error).message).toContain(field);
  }
}

describe("inventario.schemas", () => {
  it("parsea un insumo válido y conserva opcionales ausentes fuera del objeto", () => {
    expect(parseInsumoInput({
      codigo: "BAN-30",
      nombre: "Bandeja",
      unidadMedida: "unidad",
      stockMinimo: 10,
    })).toEqual({
      codigo: "BAN-30",
      nombre: "Bandeja",
      unidadMedida: "unidad",
      stockMinimo: 10,
    });
  });

  it("rechaza cantidades y mínimos negativos", () => {
    expectBadInput(() => parseInsumoInput({
      codigo: "A",
      nombre: "Alimento",
      unidadMedida: "bulto",
      stockMinimo: -1,
    }), "stockMinimo");
  });

  it("rechaza compras con detalles repetidos", () => {
    expectBadInput(() => parseCompraInput({
      fecha: "2026-10-01",
      proveedorId: 1,
      total: 20,
      detalles: [
        { insumoId: 1, cantidad: 1, costoUnitario: 10 },
        { insumoId: 1, cantidad: 1, costoUnitario: 10 },
      ],
    }), "repetido");
  });

  it("valida filtros y aplica paginación predeterminada", () => {
    expect(parseInventarioFilters({ insumoId: "3", fechaDesde: "2026-09-01" })).toEqual({
      insumoId: 3,
      fechaDesde: new Date("2026-09-01"),
      page: 1,
      limit: 20,
    });
  });

  it("exige galpón para el consumo de galpón en el servicio de entrada", () => {
    expect(parseMovimientoInput({
      codigoTipoMovimiento: "CONSUMO_GALPON",
      insumoId: 1,
      cantidad: 2,
    })).toEqual({
      codigoTipoMovimiento: "CONSUMO_GALPON",
      insumoId: 1,
      cantidad: 2,
    });
  });
});
