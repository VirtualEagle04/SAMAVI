import type { Contacto } from "../types/usuarios.types"

/**
 * Área de cada permiso, solo para agruparlos en pantalla. Un código que no
 * esté aquí aparece en "Otros".
 */
const AREAS: Record<string, string> = {
  VER_PRODUCCION: "Producción",
  INGRESAR_CONTEO: "Producción",
  REGISTRAR_CIERRE_DIARIO: "Producción",
  INGRESAR_PEDIDO: "Comercial",
  REGISTRAR_VENTA: "Comercial",
  EDITAR_PRECIOS: "Comercial",
  GESTIONAR_MAYORISTAS: "Comercial",
  GESTIONAR_GALPONES: "Galpones y socios",
  GESTIONAR_SOCIOS: "Galpones y socios",
  GESTIONAR_INVENTARIO: "Inventario",
  VER_CIERRE: "Cierre semanal",
  INGRESAR_GASTO: "Cierre semanal",
  CERRAR_SEMANA: "Cierre semanal",
  GESTIONAR_USUARIOS: "Administración",
  VER_AUDITORIA: "Administración",
}

const ORDEN_AREAS = ["Producción", "Comercial", "Galpones y socios", "Inventario", "Cierre semanal", "Administración", "Otros"]

export const areaPermiso = (codigo: string) => AREAS[codigo] ?? "Otros"

/** Agrupa una lista por área de permiso, en un orden estable. */
export function agruparPorArea<T extends { codigo: string }>(items: T[]): { area: string; items: T[] }[] {
  const grupos = new Map<string, T[]>()
  for (const item of items) {
    const area = areaPermiso(item.codigo)
    grupos.set(area, [...(grupos.get(area) ?? []), item])
  }
  return ORDEN_AREAS.filter((area) => grupos.has(area)).map((area) => ({ area, items: grupos.get(area) ?? [] }))
}

/** Lee el contacto guardado (JSON libre) como teléfono y correo. */
export function leerContacto(contacto: Record<string, unknown> | null): Contacto {
  return {
    ...(typeof contacto?.telefono === "string" ? { telefono: contacto.telefono } : {}),
    ...(typeof contacto?.correo === "string" ? { correo: contacto.correo } : {}),
  }
}

export function contactoTexto(contacto: Record<string, unknown> | null): string {
  const { telefono, correo } = leerContacto(contacto)
  return [telefono, correo].filter(Boolean).join(" · ") || "—"
}
