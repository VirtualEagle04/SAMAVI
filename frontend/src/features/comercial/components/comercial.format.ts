import type { CategoriaComercial, PrecioMayorista } from "../types/comercial.types"

/** `$12,500 COP`: formato de dinero del módulo Comercial. */
export const formatPesos = (value: number) => `$${Math.round(value).toLocaleString("en-US")} COP`

export function formatWeightRange(categoria: CategoriaComercial): string {
  const { pesoMinG, pesoMaxG } = categoria
  if (pesoMinG !== null && pesoMaxG !== null) return `${pesoMinG} g – ${pesoMaxG} g`
  if (pesoMinG !== null) return `≥ ${pesoMinG} g`
  if (pesoMaxG !== null) return `≤ ${pesoMaxG} g`
  return "Sin rango de peso"
}

/** Valor del precio si está configurado (mayor a cero); `null` si no. */
export function precioConfigurado(precio: PrecioMayorista | undefined): number | null {
  if (!precio) return null
  const valor = Number(precio.valorUnitario)
  return Number.isFinite(valor) && valor > 0 ? valor : null
}
