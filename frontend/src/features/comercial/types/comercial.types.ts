export type EstadoPedido = "pendiente" | "cargado" | "entregado" | "entregado_parcial" | "cancelado"

export interface CategoriaComercial {
  codigo: string
  nombre: string
  pesoMinG: number | null
  pesoMaxG: number | null
}

export interface Mayorista {
  id: number
  nombre: string
  ubicacion: string | null
  contacto: Record<string, unknown> | null
}

export interface PrecioMayorista {
  idMayorista: number
  codigoCategoriaPeso: string
  valorUnitario: number | string
  categoriaPeso?: CategoriaComercial
}

export interface DetallePedido {
  codigoCategoriaPeso: string
  cantidadSolicitada: number
  categoriaPeso: CategoriaComercial
}

export interface DetalleVenta {
  codigoCategoriaPeso: string
  cantidadVendida: number
  cantidadNoEntregada: number
  motivoNoEntrega: string | null
  precioAplicado: number | string
  distribuciones: { idGalpon: number; cantidad: number; galpon: GalponComercial }[]
}

export interface Pedido {
  id: number
  fecha: string
  estado: EstadoPedido
  idMayorista: number
  mayorista: Mayorista
  detalles: DetallePedido[]
  venta: { id: number; fechaHora: string; detalles: DetalleVenta[] } | null
}

export interface GalponComercial {
  id: number
  nombre: string
  estado: string
}

export interface InventarioComercial {
  idGalpon: number
  codigoCategoriaPeso: string
  fechaCorte: string
  cantidadBandejas: number
  galpon?: GalponComercial
}

export interface DisponibilidadPedido {
  fecha: string
  cierreRealizado: boolean
  categorias: {
    categoriaPeso: string
    nombre: string
    cantidadSolicitada: number
    cantidadDisponible: number
    cantidadRecomendada: number
    cantidadNoEntregada: number
    galpones: { galponId: number; nombre: string; disponible: number; recomendada: number }[]
  }[]
}
