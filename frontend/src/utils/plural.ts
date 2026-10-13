/** Devuelve "1 insumo" / "3 insumos"; pasa `plural` si no es singular + "s". */
export const pluralize = (
  count: number,
  singular: string,
  plural = `${singular}s`,
) => `${count.toLocaleString("es-CO")} ${count === 1 ? singular : plural}`;

/** Solo la palabra, sin el número (para unidades junto a una cifra grande). */
export const pluralWord = (
  count: number,
  singular: string,
  plural = `${singular}s`,
) => (count === 1 ? singular : plural);
