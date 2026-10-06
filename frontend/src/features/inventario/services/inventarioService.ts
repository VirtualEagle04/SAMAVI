import { useAuthStore } from "../../../stores/authStore"
import type { Compra, Insumo, Movimiento, Paginated, Proveedor, StockInsumo } from "../types/inventario.types"

const API_URL = import.meta.env.VITE_API_URL ?? ""

type RequestOptions = RequestInit & { json?: unknown }

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = useAuthStore.getState().token
  const headers = new Headers(options.headers)
  if (options.json !== undefined) headers.set("Content-Type", "application/json")
  if (token) headers.set("Authorization", `Bearer ${token}`)
  const response = await fetch(`${API_URL}/api/v1${path}`, {
    ...options,
    body: options.json === undefined ? options.body : JSON.stringify(options.json),
    headers,
  })
  if (response.status === 204) return undefined as T
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null
    throw new Error(typeof body?.error === "string" ? body.error : `No se pudo completar la solicitud (${response.status})`)
  }
  return response.json() as Promise<T>
}

export const getInsumos = () => request<Insumo[]>("/inventario/insumos")
export const createInsumo = (json: Record<string, unknown>) => request<Insumo>("/inventario/insumos", { method: "POST", json })
export const updateInsumo = (id: number, json: Record<string, unknown>) => request<Insumo>(`/inventario/insumos/${id}`, { method: "PUT", json })
export const setInsumoActive = (id: number, activo: boolean) => request<Insumo>(`/inventario/insumos/${id}/activo`, { method: "PATCH", json: { activo } })
export const deleteInsumo = (id: number) => request<void>(`/inventario/insumos/${id}`, { method: "DELETE" })

export const getStock = () => request<StockInsumo[]>("/inventario/stock")
export const getStockMovements = (id: number) => request<Paginated<Movimiento>>(`/inventario/stock/${id}/movimientos?limit=100`)

export const getProveedores = () => request<Proveedor[]>("/inventario/proveedores")
export const createProveedor = (json: Record<string, unknown>) => request<Proveedor>("/inventario/proveedores", { method: "POST", json })
export const updateProveedor = (id: number, json: Record<string, unknown>) => request<Proveedor>(`/inventario/proveedores/${id}`, { method: "PUT", json })
export const setProveedorActive = (id: number, activo: boolean) => request<Proveedor>(`/inventario/proveedores/${id}/activo`, { method: "PATCH", json: { activo } })
export const deleteProveedor = (id: number) => request<void>(`/inventario/proveedores/${id}`, { method: "DELETE" })

export const getCompras = (page = 1) => request<Paginated<Compra>>(`/inventario/compras?page=${page}&limit=20`)

export async function createCompra(data: Record<string, unknown>, receipt?: File): Promise<Compra> {
  const token = useAuthStore.getState().token
  const formData = new FormData()
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) formData.append(key, typeof value === "string" ? value : JSON.stringify(value))
  })
  if (receipt) formData.append("recibo", receipt)
  const response = await fetch(`${API_URL}/api/v1/inventario/compras`, {
    method: "POST",
    body: formData,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null
    throw new Error(typeof body?.error === "string" ? body.error : `No se pudo registrar la compra (${response.status})`)
  }
  return response.json() as Promise<Compra>
}

export const createMovimiento = (json: Record<string, unknown>) => request<Movimiento>("/inventario/movimientos", { method: "POST", json })

export async function downloadReceipt(id: number): Promise<Blob> {
  const token = useAuthStore.getState().token
  const response = await fetch(`${API_URL}/api/v1/inventario/compras/${id}/recibo`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  if (!response.ok) throw new Error("No se pudo abrir el recibo")
  return response.blob()
}
