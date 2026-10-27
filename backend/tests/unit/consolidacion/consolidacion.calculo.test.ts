import { describe, it, expect } from "vitest";
import {
  calcularConsolidacion,
  repartirBandejas,
  repartirProporcional,
  type EntradaCalculo,
} from "../../../src/modules/consolidacion/consolidacion.calculo.js";

function entrada(cambios: Partial<EntradaCalculo> = {}): EntradaCalculo {
  return {
    galpones: [
      { id: 1, nombre: "Galpón 1", activo: true },
      { id: 2, nombre: "Galpón 2", activo: false },
      { id: 3, nombre: "Galpón 3", activo: true },
    ],
    ventas: [],
    disponible: new Map(),
    insumos: [],
    gastos: [],
    inversiones: [
      { idSocio: 1, nombre: "Mauricio", idGalpon: 1, puntosBasicos: 5_000 },
      { idSocio: 2, nombre: "J.C.V", idGalpon: 1, puntosBasicos: 2_500 },
      { idSocio: 3, nombre: "L.F.D", idGalpon: 1, puntosBasicos: 2_500 },
      { idSocio: 3, nombre: "L.F.D", idGalpon: 3, puntosBasicos: 10_000 },
    ],
    deudaAnterior: new Map(),
    ...cambios,
  };
}

describe("repartirProporcional", () => {
  it("reparte por mayor residuo y conserva el total", () => {
    expect(repartirProporcional(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(repartirProporcional(1_000, [2_500, 2_500, 5_000])).toEqual([250, 250, 500]);
  });

  it("devuelve ceros sin total o sin pesos", () => {
    expect(repartirProporcional(0, [1, 2])).toEqual([0, 0]);
    expect(repartirProporcional(50, [0, 0])).toEqual([0, 0]);
  });
});

describe("calcularConsolidacion", () => {
  it("usa la distribución registrada y prorratea el resto por lo disponible en la categoría", () => {
    const resultado = calcularConsolidacion(entrada({
      ventas: [
        // 10 bandejas de A a $13.000: 4 registradas en el galpón 1 y 6 sin galpón.
        { categoria: "A", cantidadVendida: 10, precioCentavos: 1_300_000, distribucion: [{ idGalpon: 1, cantidad: 4 }] },
      ],
      disponible: new Map([
        [1, { A: 10 }],
        [3, { A: 30 }],
      ]),
    }));

    // Las 6 bandejas sin galpón se reparten 1,5 / 4,5 y el empate de residuos favorece al galpón 1: 2 y 4.
    const [galpon1, galpon3] = resultado.galpones;
    expect(galpon1).toMatchObject({ id: 1, ingresosAsignados: 5_200_000, ingresosProrrateados: 2_600_000, ingresos: 7_800_000 });
    expect(galpon3).toMatchObject({ id: 3, ingresosAsignados: 0, ingresosProrrateados: 5_200_000, ingresos: 5_200_000 });
    expect(resultado.advertencias).toContain(
      "Algunas ventas no registran el galpón de origen; sus bandejas se prorratearon según lo disponible por galpón",
    );
    expect(resultado.bloqueos).toEqual([]);
  });

  it("prorratea cada precio en bandejas enteras como el cálculo manual de la semana 7-13 ago 2026", () => {
    const resultado = calcularConsolidacion(entrada({
      galpones: [
        { id: 1, nombre: "Galpón 1", activo: true },
        { id: 3, nombre: "Galpón 3", activo: true },
        { id: 4, nombre: "Galpón 4", activo: true },
      ],
      inversiones: [],
      ventas: [
        { categoria: "Ex", cantidadVendida: 64, precioCentavos: 1_400_000, distribucion: [] },
        { categoria: "Ex", cantidadVendida: 41, precioCentavos: 1_500_000, distribucion: [] },
        { categoria: "Y", cantidadVendida: 5, precioCentavos: 2_000_000, distribucion: [] },
      ],
      disponible: new Map([
        [1, { Ex: 40, Y: 3 }],
        [3, { Ex: 20, Y: 1 }],
        [4, { Ex: 45, Y: 2 }],
      ]),
    }));

    // Ex: 24/12/28 a $14.000 y 16/8/17 a $15.000. Y: 2/1/2 a $20.000.
    expect(resultado.galpones.map((galpon) => galpon.ingresosProrrateados)).toEqual([
      24 * 1_400_000 + 16 * 1_500_000 + 2 * 2_000_000,
      12 * 1_400_000 + 8 * 1_500_000 + 1 * 2_000_000,
      28 * 1_400_000 + 17 * 1_500_000 + 2 * 2_000_000,
    ]);
  });

  it("bloquea el cierre si hay ventas sin galpón y ninguna existencia de la categoría", () => {
    const resultado = calcularConsolidacion(entrada({
      ventas: [{ categoria: "Y", cantidadVendida: 1, precioCentavos: 2_000_000, distribucion: [] }],
    }));

    expect(resultado.ingresosSinAsignar).toBe(2_000_000);
    expect(resultado.bloqueos[0]).toContain("ventas de Y sin galpón de origen");
  });

  it("divide cada gasto en partes iguales solo entre sus galpones y descuenta insumos", () => {
    const resultado = calcularConsolidacion(entrada({
      ventas: [{ categoria: "AA", cantidadVendida: 10, precioCentavos: 1_000_000, distribucion: [{ idGalpon: 1, cantidad: 10 }] }],
      insumos: [
        { idGalpon: 1, concepto: "Alimento", unidad: "bulto", cantidad: 3, centavos: 1_500_000 },
        { idGalpon: 1, concepto: "Alimento", unidad: "bulto", cantidad: -1, centavos: -500_000 },
      ],
      gastos: [
        { id: 1, centavos: 100, galpones: [3, 1] },
        { id: 2, centavos: 3_000_000, galpones: [1] },
      ],
    }));

    const [galpon1, galpon3] = resultado.galpones;
    expect(galpon1).toMatchObject({ insumos: 1_000_000, gastos: 3_000_050, resultado: 5_999_950, repartible: 5_999_950 });
    expect(galpon1?.insumosDetalle).toEqual([{ concepto: "Alimento", unidad: "bulto", cantidad: 2, centavos: 1_000_000 }]);
    expect(galpon3).toMatchObject({ gastos: 50, resultado: -50 });
  });

  it("detalla por galpón las bandejas registradas y prorrateadas a cada precio", () => {
    const resultado = calcularConsolidacion(entrada({
      ventas: [
        { categoria: "A", cantidadVendida: 10, precioCentavos: 1_300_000, distribucion: [{ idGalpon: 1, cantidad: 4 }] },
        { categoria: "A", cantidadVendida: 2, precioCentavos: 1_200_000, distribucion: [{ idGalpon: 3, cantidad: 2 }] },
      ],
      disponible: new Map([
        [1, { A: 10 }],
        [3, { A: 30 }],
      ]),
    }));

    const [galpon1, galpon3] = resultado.galpones;
    // A $13.000: 4 registradas en el galpón 1 y 6 prorrateadas 2/4.
    expect(galpon1?.ventas).toEqual([{ categoria: "A", precioCentavos: 1_300_000, bandejas: 6, centavos: 7_800_000 }]);
    expect(galpon1?.disponible).toEqual({ A: 10 });
    expect(galpon3?.ventas).toEqual([
      { categoria: "A", precioCentavos: 1_200_000, bandejas: 2, centavos: 2_400_000 },
      { categoria: "A", precioCentavos: 1_300_000, bandejas: 4, centavos: 5_200_000 },
    ]);
  });

  it("reparte lo repartible según el porcentaje de cada socio", () => {
    const resultado = calcularConsolidacion(entrada({
      ventas: [{ categoria: "A", cantidadVendida: 1, precioCentavos: 1_000_001, distribucion: [{ idGalpon: 1, cantidad: 1 }] }],
    }));

    const socios = resultado.galpones[0]?.socios ?? [];
    expect(socios.map((socio) => socio.centavos)).toEqual([500_001, 250_000, 250_000]);
    expect(socios.reduce((suma, socio) => suma + socio.centavos, 0)).toBe(1_000_001);
  });

  it("convierte la pérdida en deuda del galpón y no reparte", () => {
    const resultado = calcularConsolidacion(entrada({
      gastos: [{ id: 1, centavos: 400_000, galpones: [3] }],
      deudaAnterior: new Map([[3, 100_000]]),
    }));

    const galpon3 = resultado.galpones.find((galpon) => galpon.id === 3);
    expect(galpon3).toMatchObject({ resultado: -400_000, abonoDeuda: 0, deudaFinal: 500_000, repartible: 0 });
    expect(galpon3?.socios[0]?.centavos).toBe(0);
    expect(resultado.advertencias).toContain("Galpón 3 tuvo pérdida en la semana; el déficit queda como deuda del galpón");
  });

  it("abona primero la deuda anterior y reparte solo el excedente", () => {
    const resultado = calcularConsolidacion(entrada({
      ventas: [{ categoria: "A", cantidadVendida: 1, precioCentavos: 700_000, distribucion: [{ idGalpon: 3, cantidad: 1 }] }],
      deudaAnterior: new Map([[3, 500_000]]),
    }));

    const galpon3 = resultado.galpones.find((galpon) => galpon.id === 3);
    expect(galpon3).toMatchObject({ resultado: 700_000, abonoDeuda: 500_000, deudaFinal: 0, repartible: 200_000 });
    expect(galpon3?.socios).toEqual([{ idSocio: 3, nombre: "L.F.D", puntosBasicos: 10_000, centavos: 200_000 }]);
  });

  it("incluye galpones activos y los inactivos solo si tienen movimientos", () => {
    const sinMovimientos = calcularConsolidacion(entrada());
    expect(sinMovimientos.galpones.map((galpon) => galpon.id)).toEqual([1, 3]);

    const conGasto = calcularConsolidacion(entrada({ gastos: [{ id: 1, centavos: 100, galpones: [2] }] }));
    expect(conGasto.galpones.map((galpon) => galpon.id)).toEqual([1, 2, 3]);
  });

  it("bloquea si los porcentajes de un galpón no suman 100 %", () => {
    const resultado = calcularConsolidacion(entrada({
      inversiones: [{ idSocio: 1, nombre: "Mauricio", idGalpon: 1, puntosBasicos: 7_500 }],
    }));

    expect(resultado.bloqueos).toContain("Los porcentajes de inversión de Galpón 1 suman 75.00 % y deben sumar 100 %");
  });

  it("bloquea si un galpón con ganancia no tiene socios", () => {
    const resultado = calcularConsolidacion(entrada({
      ventas: [{ categoria: "A", cantidadVendida: 1, precioCentavos: 100, distribucion: [{ idGalpon: 3, cantidad: 1 }] }],
      inversiones: [],
    }));

    expect(resultado.bloqueos).toContain("Galpón 3 tiene ganancia para repartir pero no tiene socios registrados");
  });
});

describe("repartirBandejas", () => {
  it("divide cada precio por separado según lo disponible", () => {
    expect(repartirBandejas([148, 30], [187, 265, 125])).toEqual([[48, 68, 32], [10, 14, 6]]);
  });

  it("no asigna a un galpón más bandejas de las disponibles", () => {
    // Por separado, el galpón 1 recibiría 4 + 1 de los 4 que tiene.
    const partes = repartirBandejas([1, 10], [4, 3, 4]);
    const porGalpon = [0, 1, 2].map((g) => partes.reduce((suma, tramo) => suma + (tramo[g] ?? 0), 0));
    expect(porGalpon).toEqual([4, 3, 4]);
  });

  it("corrige el redondeo moviendo una sola bandeja cuando se vende todo (AA, 7-13 ago 2026)", () => {
    const partes = repartirBandejas([141, 50, 30, 112, 99], [156, 142, 134]);
    const porGalpon = [0, 1, 2].map((g) => partes.reduce((suma, tramo) => suma + (tramo[g] ?? 0), 0));
    expect(porGalpon).toEqual([156, 142, 134]);
    // Por separado quedaban 135 en el galpón 4 y 141 en el 3: solo cambia un tramo.
    const separados = [141, 50, 30, 112, 99].map((bandejas) => repartirProporcional(bandejas, [156, 142, 134]));
    expect(partes.filter((tramo, t) => tramo.join() !== separados[t]?.join())).toHaveLength(1);
  });
});
