/**
 * Cálculo puro del cierre semanal. Todos los montos van en centavos enteros
 * para que los repartos cuadren exactamente con los totales.
 */

export type GalponCalculo = { id: number; nombre: string; activo: boolean };

export type LineaVenta = {
  categoria: string;
  cantidadVendida: number;
  precioCentavos: number;
  distribucion: Array<{ idGalpon: number; cantidad: number }>;
};

/** Consumo de un insumo en un galpón; una devolución lleva cantidad y centavos negativos. */
export type ConsumoInsumo = { idGalpon: number; concepto: string; unidad: string; cantidad: number; centavos: number };

export type GastoCalculo = { id: number; centavos: number; galpones: number[] };

export type InversionCalculo = { idSocio: number; nombre: string; idGalpon: number; puntosBasicos: number };

export type EntradaCalculo = {
  galpones: GalponCalculo[];
  ventas: LineaVenta[];
  /** Bandejas disponibles por galpón y categoría (producción de la semana + bodega inicial). */
  disponible: Map<number, Record<string, number>>;
  insumos: ConsumoInsumo[];
  gastos: GastoCalculo[];
  inversiones: InversionCalculo[];
  deudaAnterior: Map<number, number>;
};

export type RepartoSocio = { idSocio: number; nombre: string; puntosBasicos: number; centavos: number };

/** Bandejas de una categoría que se le asignan a un galpón a un precio, registradas o prorrateadas. */
export type IngresoGalpon = { categoria: string; precioCentavos: number; bandejas: number; centavos: number };

export type InsumoGalpon = { concepto: string; unidad: string; cantidad: number; centavos: number };

export type ResultadoGalpon = {
  id: number;
  nombre: string;
  /** Detalle de ingresos por categoría y precio, ordenado por categoría y precio. */
  ventas: IngresoGalpon[];
  /** Consumo de insumos agrupado por insumo. */
  insumosDetalle: InsumoGalpon[];
  /** Bandejas disponibles en la semana por categoría. */
  disponible: Record<string, number>;
  ingresosAsignados: number;
  ingresosProrrateados: number;
  ingresos: number;
  insumos: number;
  gastos: number;
  resultado: number;
  deudaAnterior: number;
  abonoDeuda: number;
  deudaFinal: number;
  repartible: number;
  socios: RepartoSocio[];
};

export type ResultadoCalculo = {
  galpones: ResultadoGalpon[];
  ingresosSinAsignar: number;
  advertencias: string[];
  bloqueos: string[];
};

export const PUNTOS_BASICOS_TOTALES = 10_000;

export function aCentavos(value: { toNumber(): number } | number): number {
  const numero = typeof value === "number" ? value : value.toNumber();
  return Math.round(numero * 100);
}

export function aPesos(centavos: number): number {
  return centavos / 100;
}

/**
 * Reparte `total` (entero no negativo) en partes enteras proporcionales a `pesos`
 * por el método del mayor residuo; los empates favorecen al primero de la lista.
 */
export function repartirProporcional(total: number, pesos: number[]): number[] {
  const sumaPesos = pesos.reduce((suma, peso) => suma + peso, 0);
  if (total <= 0 || sumaPesos <= 0) return pesos.map(() => 0);

  const partes = pesos.map((peso, index) => {
    const exacta = (total * peso) / sumaPesos;
    return { index, valor: Math.floor(exacta), residuo: exacta - Math.floor(exacta) };
  });
  let restante = total - partes.reduce((suma, parte) => suma + parte.valor, 0);
  const porResiduo = [...partes].sort((a, b) => b.residuo - a.residuo || a.index - b.index);
  for (const parte of porResiduo) {
    if (restante <= 0) break;
    parte.valor += 1;
    restante -= 1;
  }
  return partes.map((parte) => parte.valor);
}

/**
 * Reparte en bandejas enteras las vendidas de una categoría a cada precio
 * (`tramos`) según lo disponible por galpón, como en el prorrateo manual: cada
 * precio se divide por separado en proporción a lo disponible. Si el redondeo
 * deja a un galpón con más bandejas de las que tenía, se pasan bandejas de una
 * en una a un galpón al que le falten, en el precio donde menos se aparta de la
 * proporción exacta. Devuelve [tramo][galpón].
 */
export function repartirBandejas(tramos: number[], disponibles: number[]): number[][] {
  const porTramo = tramos.map((bandejas) => repartirProporcional(bandejas, disponibles));
  const vendidas = tramos.reduce((suma, bandejas) => suma + bandejas, 0);
  const totalDisponible = disponibles.reduce((suma, bandejas) => suma + bandejas, 0);
  // Si se vendió más de lo disponible, algún galpón queda por encima de todos modos.
  if (vendidas > totalDisponible) return porTramo;

  const exacta = (t: number, g: number) => ((tramos[t] ?? 0) * (disponibles[g] ?? 0)) / totalDisponible;
  const asignadas = (g: number) => porTramo.reduce((suma, partes) => suma + (partes[g] ?? 0), 0);
  for (;;) {
    const sobra = disponibles.findIndex((disponible, g) => asignadas(g) > disponible);
    if (sobra < 0) break;
    let mejor: { partes: number[]; g: number; puntaje: number } | null = null;
    for (let g = 0; g < disponibles.length; g++) {
      if (asignadas(g) >= (disponibles[g] ?? 0)) continue;
      for (let t = 0; t < porTramo.length; t++) {
        const partes = porTramo[t] ?? [];
        if ((partes[sobra] ?? 0) <= 0) continue;
        const puntaje = (partes[sobra] ?? 0) - exacta(t, sobra) + exacta(t, g) - (partes[g] ?? 0);
        if (!mejor || puntaje > mejor.puntaje) mejor = { partes, g, puntaje };
      }
    }
    if (!mejor) break;
    mejor.partes[sobra] = (mejor.partes[sobra] ?? 0) - 1;
    mejor.partes[mejor.g] = (mejor.partes[mejor.g] ?? 0) + 1;
  }
  return porTramo;
}

function sumar(mapa: Map<number, number>, id: number, valor: number) {
  mapa.set(id, (mapa.get(id) ?? 0) + valor);
}

function formatoPorcentaje(puntosBasicos: number): string {
  return `${(puntosBasicos / 100).toFixed(2)} %`;
}

export function calcularConsolidacion(entrada: EntradaCalculo): ResultadoCalculo {
  const advertencias: string[] = [];
  const bloqueos: string[] = [];
  const nombres = new Map(entrada.galpones.map((galpon) => [galpon.id, galpon.nombre]));
  const nombre = (id: number) => nombres.get(id) ?? `Galpón ${id}`;

  // Detalle de bandejas por galpón: "categoría|precio" -> línea.
  const lineasVenta = new Map<number, Map<string, IngresoGalpon>>();
  const anotarVenta = (idGalpon: number, categoria: string, precioCentavos: number, bandejas: number) => {
    if (bandejas <= 0) return;
    const lineas = lineasVenta.get(idGalpon) ?? new Map<string, IngresoGalpon>();
    const clave = `${categoria}|${precioCentavos}`;
    const linea = lineas.get(clave) ?? { categoria, precioCentavos, bandejas: 0, centavos: 0 };
    linea.bandejas += bandejas;
    linea.centavos += bandejas * precioCentavos;
    lineas.set(clave, linea);
    lineasVenta.set(idGalpon, lineas);
  };

  // Ingresos: lo que la venta registra por galpón, y el resto prorrateado por categoría.
  const asignados = new Map<number, number>();
  // categoría -> precio en centavos -> bandejas vendidas sin galpón de origen
  const sinDistribuir = new Map<string, Map<number, number>>();
  for (const linea of entrada.ventas) {
    let distribuidas = 0;
    for (const item of linea.distribucion) {
      sumar(asignados, item.idGalpon, item.cantidad * linea.precioCentavos);
      anotarVenta(item.idGalpon, linea.categoria, linea.precioCentavos, item.cantidad);
      distribuidas += item.cantidad;
    }
    const restantes = linea.cantidadVendida - distribuidas;
    if (restantes > 0) {
      const porPrecio = sinDistribuir.get(linea.categoria) ?? new Map<number, number>();
      sumar(porPrecio, linea.precioCentavos, restantes);
      sinDistribuir.set(linea.categoria, porPrecio);
    }
  }

  const prorrateados = new Map<number, number>();
  let ingresosSinAsignar = 0;
  for (const [categoria, porPrecio] of sinDistribuir) {
    const candidatos = [...entrada.disponible.entries()]
      .map(([idGalpon, cantidades]) => ({ idGalpon, bandejas: cantidades[categoria] ?? 0 }))
      .filter((candidato) => candidato.bandejas > 0)
      .sort((a, b) => a.idGalpon - b.idGalpon);
    const tramos = [...porPrecio.entries()]
      .map(([precioCentavos, bandejas]) => ({ precioCentavos, bandejas }))
      .sort((a, b) => a.precioCentavos - b.precioCentavos);
    if (!candidatos.length) {
      ingresosSinAsignar += tramos.reduce((suma, tramo) => suma + tramo.bandejas * tramo.precioCentavos, 0);
      bloqueos.push(`Hay ventas de ${categoria} sin galpón de origen y ningún galpón tuvo ${categoria} disponible en la semana`);
      continue;
    }
    const bandejas = repartirBandejas(tramos.map((tramo) => tramo.bandejas), candidatos.map((candidato) => candidato.bandejas));
    tramos.forEach((tramo, t) => {
      candidatos.forEach((candidato, g) => {
        const asignadas = bandejas[t]?.[g] ?? 0;
        sumar(prorrateados, candidato.idGalpon, asignadas * tramo.precioCentavos);
        anotarVenta(candidato.idGalpon, categoria, tramo.precioCentavos, asignadas);
      });
    });
  }
  if (sinDistribuir.size > 0) {
    advertencias.push("Algunas ventas no registran el galpón de origen; sus bandejas se prorratearon según lo disponible por galpón");
  }

  const insumos = new Map<number, number>();
  const lineasInsumo = new Map<number, Map<string, InsumoGalpon>>();
  for (const consumo of entrada.insumos) {
    sumar(insumos, consumo.idGalpon, consumo.centavos);
    const lineas = lineasInsumo.get(consumo.idGalpon) ?? new Map<string, InsumoGalpon>();
    const linea = lineas.get(consumo.concepto) ?? { concepto: consumo.concepto, unidad: consumo.unidad, cantidad: 0, centavos: 0 };
    linea.cantidad += consumo.cantidad;
    linea.centavos += consumo.centavos;
    lineas.set(consumo.concepto, linea);
    lineasInsumo.set(consumo.idGalpon, lineas);
  }

  const gastos = new Map<number, number>();
  for (const gasto of entrada.gastos) {
    const galpones = [...new Set(gasto.galpones)].sort((a, b) => a - b);
    const partes = repartirProporcional(gasto.centavos, galpones.map(() => 1));
    galpones.forEach((idGalpon, index) => sumar(gastos, idGalpon, partes[index] ?? 0));
  }

  const inversionesPorGalpon = new Map<number, InversionCalculo[]>();
  for (const inversion of entrada.inversiones) {
    const lista = inversionesPorGalpon.get(inversion.idGalpon) ?? [];
    lista.push(inversion);
    inversionesPorGalpon.set(inversion.idGalpon, lista);
  }

  const ids = new Set<number>(entrada.galpones.filter((galpon) => galpon.activo).map((galpon) => galpon.id));
  for (const mapa of [asignados, prorrateados, insumos, gastos, entrada.deudaAnterior]) {
    for (const [id, valor] of mapa) if (valor !== 0) ids.add(id);
  }

  const galpones = [...ids].sort((a, b) => a - b).map((id): ResultadoGalpon => {
    const ingresosAsignados = asignados.get(id) ?? 0;
    const ingresosProrrateados = prorrateados.get(id) ?? 0;
    const ingresos = ingresosAsignados + ingresosProrrateados;
    const insumosGalpon = insumos.get(id) ?? 0;
    const gastosGalpon = gastos.get(id) ?? 0;
    const resultado = ingresos - insumosGalpon - gastosGalpon;
    const deudaAnterior = entrada.deudaAnterior.get(id) ?? 0;
    const ganancia = Math.max(resultado, 0);
    const abonoDeuda = Math.min(ganancia, deudaAnterior);
    const repartible = ganancia - abonoDeuda;
    const deudaFinal = deudaAnterior - abonoDeuda + Math.max(-resultado, 0);

    const inversiones = [...(inversionesPorGalpon.get(id) ?? [])].sort((a, b) => a.idSocio - b.idSocio);
    const sumaPuntos = inversiones.reduce((suma, inversion) => suma + inversion.puntosBasicos, 0);
    if (repartible > 0 && !inversiones.length) {
      bloqueos.push(`${nombre(id)} tiene ganancia para repartir pero no tiene socios registrados`);
    } else if (inversiones.length && sumaPuntos !== PUNTOS_BASICOS_TOTALES) {
      bloqueos.push(`Los porcentajes de inversión de ${nombre(id)} suman ${formatoPorcentaje(sumaPuntos)} y deben sumar 100 %`);
    }
    // Si los porcentajes no suman 100 %, solo se reparte la fracción registrada.
    const totalSocios = Math.round((repartible * sumaPuntos) / PUNTOS_BASICOS_TOTALES);
    const partes = repartirProporcional(totalSocios, inversiones.map((inversion) => inversion.puntosBasicos));
    const socios = inversiones.map((inversion, index) => ({
      idSocio: inversion.idSocio,
      nombre: inversion.nombre,
      puntosBasicos: inversion.puntosBasicos,
      centavos: partes[index] ?? 0,
    }));

    if (resultado < 0) {
      advertencias.push(`${nombre(id)} tuvo pérdida en la semana; el déficit queda como deuda del galpón`);
    }

    return {
      id,
      nombre: nombre(id),
      ventas: [...(lineasVenta.get(id)?.values() ?? [])].sort(
        (a, b) => a.categoria.localeCompare(b.categoria) || a.precioCentavos - b.precioCentavos,
      ),
      insumosDetalle: [...(lineasInsumo.get(id)?.values() ?? [])]
        .filter((linea) => linea.centavos !== 0 || linea.cantidad !== 0)
        .sort((a, b) => b.centavos - a.centavos),
      disponible: { ...(entrada.disponible.get(id) ?? {}) },
      ingresosAsignados,
      ingresosProrrateados,
      ingresos,
      insumos: insumosGalpon,
      gastos: gastosGalpon,
      resultado,
      deudaAnterior,
      abonoDeuda,
      deudaFinal,
      repartible,
      socios,
    };
  });

  return { galpones, ingresosSinAsignar, advertencias, bloqueos };
}
