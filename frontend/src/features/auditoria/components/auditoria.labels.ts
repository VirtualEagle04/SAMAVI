import type { AccionAuditoria, JsonValue } from "../types/auditoria.types"

/** Nombre legible de cada tabla auditada (`database/schema.sql`). */
const TABLAS: Record<string, string> = {
  cierre_produccion_dia: "Cierre diario",
  cierre_semanal: "Cierre semanal",
  compra_insumo: "Compra de insumos",
  galpon: "Galpón",
  gasto: "Gasto",
  insumo: "Insumo",
  mayorista: "Cliente mayorista",
  movimiento_insumo: "Movimiento de inventario",
  pedido: "Pedido",
  precio: "Precio",
  proveedor: "Proveedor",
  registro_alimentacion: "Alimentación",
  venta: "Venta",
}

export const tablaLabel = (tabla: string) => TABLAS[tabla] ?? tabla

/** Nombre legible de los campos que guarda el backend en antes/después. */
const CAMPOS: Record<string, string> = {
  activo: "Activo",
  cantidad: "Cantidad",
  cantidadBandejas: "Bandejas",
  cantidadNoEntregada: "No entregada",
  cantidadSobrante: "Huevos sobrantes",
  cantidadSolicitada: "Cantidad solicitada",
  cantidadVendida: "Cantidad vendida",
  categoriaPeso: "Categoría",
  categorias: "Categorías",
  causa: "Causa",
  codigo: "Código",
  concepto: "Concepto",
  contacto: "Contacto",
  costo: "Costo",
  costoUnitario: "Costo unitario",
  descripcion: "Descripción",
  desde: "Desde",
  detalles: "Detalle",
  distribucion: "Distribución por galpón",
  estado: "Estado",
  estadoPedido: "Estado del pedido",
  fecha: "Fecha",
  galponId: "Galpón",
  galponIds: "Galpones",
  gallinasActuales: "Gallinas",
  hasta: "Hasta",
  idGalpon: "Galpón",
  idMayorista: "Cliente",
  idPedido: "Pedido",
  idProveedor: "Proveedor",
  insumoId: "Insumo",
  nombre: "Nombre",
  numeroFactura: "Factura",
  observaciones: "Observaciones",
  precioAplicado: "Precio aplicado",
  recibo: "Recibo",
  stockAnterior: "Stock anterior",
  stockMinimo: "Stock mínimo",
  tipo: "Tipo",
  tipoMovimiento: "Tipo de movimiento",
  total: "Total",
  totalGastos: "Total gastos",
  totalIngresos: "Total ingresos",
  totalInsumos: "Total insumos",
  totalRepartido: "Total repartido",
  ubicacion: "Ubicación",
  unidadMedida: "Unidad",
  valor: "Valor",
  valorUnitario: "Precio unitario",
}

/** Usa el nombre conocido o separa el camelCase: "otroCampo" → "Otro campo". */
export function campoLabel(campo: string): string {
  const conocido = CAMPOS[campo]
  if (conocido) return conocido
  const palabras = campo.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ").toLowerCase()
  return palabras.charAt(0).toUpperCase() + palabras.slice(1)
}

/** Textos de estados y tipos que llegan como códigos. */
const VALORES: Record<string, string> = {
  pendiente: "Pendiente",
  cargado: "Listo para venta",
  entregado: "Entregado",
  entregado_parcial: "Entrega parcial",
  cancelado: "Cancelado",
  activo: "Activo",
  inactivo: "Inactivo",
  mantenimiento: "En mantenimiento",
  baja: "Baja",
  ingreso: "Ingreso",
}

export const ACCIONES: Record<AccionAuditoria, { label: string; color: "success" | "info" | "error" }> = {
  INSERT: { label: "Creación", color: "success" },
  UPDATE: { label: "Modificación", color: "info" },
  DELETE: { label: "Eliminación", color: "error" },
}

export const formatFechaHora = (value: string) =>
  new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(value))

/** Texto de un valor simple; los objetos y listas los dibuja `ValorAuditoria`. */
export function formatValor(value: JsonValue | undefined): string {
  if (value === undefined || value === null || value === "") return "—"
  if (typeof value === "boolean") return value ? "Sí" : "No"
  if (typeof value === "number") return value.toLocaleString("es-CO")
  if (typeof value === "string") return VALORES[value] ?? value
  if (Array.isArray(value)) return value.map((item) => formatValor(item)).join(", ")
  return Object.entries(value)
    .map(([key, item]) => `${campoLabel(key)}: ${formatValor(item)}`)
    .join(" · ")
}

export interface CampoCambio {
  campo: string
  antes: JsonValue | undefined
  despues: JsonValue | undefined
  cambio: boolean
}

function asObject(value: JsonValue | null): Record<string, JsonValue> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : null
}

/** Une los campos de antes y después; marca los que cambiaron. */
export function compararCampos(antes: JsonValue | null, despues: JsonValue | null): CampoCambio[] {
  const a = asObject(antes)
  const d = asObject(despues)
  if (!a && !d) {
    return [{ campo: "valor", antes: antes ?? undefined, despues: despues ?? undefined, cambio: true }]
  }
  const campos = [...new Set([...Object.keys(a ?? {}), ...Object.keys(d ?? {})])]
  return campos.map((campo) => {
    const valorAntes = a?.[campo]
    const valorDespues = d?.[campo]
    return {
      campo,
      antes: valorAntes,
      despues: valorDespues,
      cambio: JSON.stringify(valorAntes) !== JSON.stringify(valorDespues),
    }
  })
}
