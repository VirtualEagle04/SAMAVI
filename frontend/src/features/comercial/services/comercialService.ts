import { useAuthStore } from "../../../stores/authStore"
import type { CategoriaComercial, DisponibilidadPedido, Mayorista, Pedido, PrecioMayorista } from "../types/comercial.types"

const API_URL = import.meta.env.VITE_API_URL ?? ""

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token
  const response = await fetch(`${API_URL}/api/v1${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (response.status === 204) return undefined as T
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(typeof body?.error === "string" ? body.error : `No se pudo completar la solicitud (${response.status})`)
  }
  return response.json() as Promise<T>
}

export const getMayoristas = () => request<Mayorista[]>("/comercial/mayoristas")
export const getCategoriasComerciales = () => request<CategoriaComercial[]>("/produccion/categorias")
export const getPedidos = () => request<Pedido[]>("/comercial/pedidos")
export const getPreciosMayorista = (id: number) => request<PrecioMayorista[]>(`/comercial/mayoristas/${id}/precios`)
export const createPedido = (data: { mayoristaId: number; detalles: { categoriaPeso: string; cantidadSolicitada: number }[] }) =>
  request<Pedido>("/comercial/pedidos", { method: "POST", body: JSON.stringify(data) })
export const updatePedido = (id: number, data: { mayoristaId: number; detalles: { categoriaPeso: string; cantidadSolicitada: number }[] }) =>
  request<Pedido>(`/comercial/pedidos/${id}`, { method: "PATCH", body: JSON.stringify(data) })
export const changePedidoStatus = (id: number, estado: "cargado" | "cancelado") =>
  request<Pedido>(`/comercial/pedidos/${id}/estado`, { method: "POST", body: JSON.stringify({ estado }) })
export const createVenta = (pedidoId: number, data: {
  detalles: { categoriaPeso: string; cantidadVendida: number }[]
  distribucion: { galponId: number; categoriaPeso: string; cantidad: number }[]
}) => request<{ id: number; fechaHora: string; detalles: { codigoCategoriaPeso: string; cantidadVendida: number; precioAplicado: number | string }[] }>(
  `/comercial/pedidos/${pedidoId}/ventas`, { method: "POST", body: JSON.stringify(data) }
)
export const getPedidoDisponibilidad = (pedidoId: number) => request<DisponibilidadPedido>(`/comercial/pedidos/${pedidoId}/disponibilidad`)
export const createMayorista = (data: { nombre: string; ubicacion?: string; contacto?: Record<string, string> }) =>
  request<Mayorista>("/comercial/mayoristas", { method: "POST", body: JSON.stringify(data) })
export const savePrecio = (id: number, data: { categoriaPeso: string; valorUnitario: number }) =>
  request<PrecioMayorista>(`/comercial/mayoristas/${id}/precios`, { method: "PUT", body: JSON.stringify(data) })
