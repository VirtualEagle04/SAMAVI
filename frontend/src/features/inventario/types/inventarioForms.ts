export type InsumoForm = {
  id?: number;
  codigo: string;
  nombre: string;
  unidadMedida: string;
  stockMinimo: string;
  costo: string;
  descripcion: string;
};

export type ProviderForm = {
  id?: number;
  nombre: string;
  telefono: string;
  email: string;
  direccion: string;
};

export type PurchaseLine = {
  insumoId: string;
  cantidad: string;
  costoUnitario: string;
  lote: string;
  fechaVencimiento: string;
};

export type MovementForm = {
  codigoTipoMovimiento: string;
  insumoId: string;
  galponId: string;
  cantidad: string;
  costoUnitario: string;
  observaciones: string;
};

export const emptyInsumo: InsumoForm = {
  codigo: "",
  nombre: "",
  unidadMedida: "unidad",
  stockMinimo: "",
  costo: "",
  descripcion: "",
};

export const emptyProvider: ProviderForm = {
  nombre: "",
  telefono: "",
  email: "",
  direccion: "",
};

export const emptyLine: PurchaseLine = {
  insumoId: "",
  cantidad: "",
  costoUnitario: "",
  lote: "",
  fechaVencimiento: "",
};

export const emptyMovement: MovementForm = {
  codigoTipoMovimiento: "CONSUMO_GALPON",
  insumoId: "",
  galponId: "",
  cantidad: "",
  costoUnitario: "",
  observaciones: "",
};
