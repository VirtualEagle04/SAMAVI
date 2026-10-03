export type EfectoMovimiento = "entrada" | "salida"

export interface Insumo {
  id: number
  codigo: string
  nombre: string
  descripcion: string | null
  unidadMedida: string
  stockMinimo: number | string
  costo: number | string
  activo: boolean
}

export interface StockInsumo {
  id: number
  codigo: string
  nombre: string
  unidadMedida: string
  stock: number | string
  stockMinimo: number | string
  costo: number | string
  valorInventario: number | string
  activo: boolean
}

export interface Proveedor {
  id: number
  nombre: string
  contacto: Record<string, unknown> | null
  activo: boolean
  creadoEn: string
}

export interface TipoMovimiento {
  codigo: string
  nombre: string
  efecto: EfectoMovimiento
  descripcion: string | null
}

export interface Movimiento {
  id: string | number
  fecha: string
  idInsumo: number
  codigoTipoMovimiento: string
  idGalpon: number | null
  cantidad: number | string
  costoUnitario: number | string | null
  idCompra: number | null
  idCierreDiario: number | null
  observaciones: string | null
  idUsuario: number
  tipoMovimiento: TipoMovimiento
  insumo: Insumo
}

export interface CompraDetalle {
  idCompra: number
  idInsumo: number
  cantidad: number | string
  costoUnitario: number | string
  subtotal: number | string
  lote: string | null
  fechaVencimiento: string | null
  insumo: Insumo
}

export interface Compra {
  id: number
  fecha: string
  idProveedor: number
  numeroFactura: string | null
  reciboMimeType: string | null
  reciboNombreArchivo: string | null
  observaciones: string | null
  total: number | string
  creadoEn: string
  proveedor: Proveedor
  detalles: CompraDetalle[]
}

export interface Paginated<T> {
  items: T[]
  page: number
  limit: number
  total: number
}
