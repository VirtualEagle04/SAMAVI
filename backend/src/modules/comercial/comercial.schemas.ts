import { Prisma } from "@prisma/client";
import { AppError } from "../../shared/errors/app-error.js";

export type MayoristaInput = {
  nombre: string;
  ubicacion?: string;
  contacto?: Prisma.InputJsonObject;
};

export type PrecioInput = {
  categoriaPeso: string;
  valorUnitario: number;
};

export type PedidoDetailInput = {
  categoriaPeso: string;
  cantidadSolicitada: number;
};

export type PedidoInput = {
  mayoristaId: number;
  detalles: PedidoDetailInput[];
};

export type VentaDetailInput = {
  categoriaPeso: string;
  cantidadVendida: number;
};

export type DistribucionInput = {
  galponId: number;
  categoriaPeso: string;
  cantidad: number;
};

export type VentaInput = {
  detalles: VentaDetailInput[];
  distribucion: DistribucionInput[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function positiveInteger(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new AppError(400, `${field} debe ser un entero positivo`);
  }
  return value;
}

function requiredText(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new AppError(400, `${field} es obligatorio`);
  }
  return value.trim();
}

function parseContact(value: unknown): Prisma.InputJsonObject | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!isRecord(value)) {
    throw new AppError(400, "contacto debe ser un objeto JSON");
  }
  return value as Prisma.InputJsonObject;
}

export function parseMayoristaInput(body: unknown): MayoristaInput {
  if (!isRecord(body)) {
    throw new AppError(400, "El cuerpo del mayorista es inválido");
  }

  const nombre = requiredText(body.nombre, "nombre");
  const ubicacion = body.ubicacion === undefined ? undefined : requiredText(body.ubicacion, "ubicacion");
  const contacto = parseContact(body.contacto);

  return {
    nombre,
    ...(ubicacion === undefined ? {} : { ubicacion }),
    ...(contacto === undefined ? {} : { contacto }),
  };
}

export function parsePrecioInput(body: unknown): PrecioInput {
  if (!isRecord(body)) {
    throw new AppError(400, "El cuerpo del precio es inválido");
  }
  const categoriaPeso = requiredText(body.categoriaPeso, "categoriaPeso");
  if (typeof body.valorUnitario !== "number" || !Number.isFinite(body.valorUnitario) || body.valorUnitario <= 0) {
    throw new AppError(400, "valorUnitario debe ser un número positivo");
  }
  return { categoriaPeso, valorUnitario: body.valorUnitario };
}

function parseDetails(value: unknown, field: string): PedidoDetailInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new AppError(400, `${field} debe contener al menos una línea`);
  }

  const seen = new Set<string>();
  return value.map((detail, index) => {
    if (!isRecord(detail)) {
      throw new AppError(400, `${field}[${index}] es inválido`);
    }
    const categoriaPeso = requiredText(detail.categoriaPeso, `${field}[${index}].categoriaPeso`);
    if (seen.has(categoriaPeso)) {
      throw new AppError(400, `La categoría ${categoriaPeso} está repetida`);
    }
    seen.add(categoriaPeso);
    return {
      categoriaPeso,
      cantidadSolicitada: positiveInteger(detail.cantidadSolicitada, `${field}[${index}].cantidadSolicitada`),
    };
  });
}

function parseVentaDetails(value: unknown): VentaDetailInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new AppError(400, "detalles debe contener al menos una línea");
  }

  const seen = new Set<string>();
  return value.map((detail, index) => {
    if (!isRecord(detail)) {
      throw new AppError(400, `detalles[${index}] es inválido`);
    }
    const categoriaPeso = requiredText(detail.categoriaPeso, `detalles[${index}].categoriaPeso`);
    if (seen.has(categoriaPeso)) {
      throw new AppError(400, `La categoría ${categoriaPeso} está repetida`);
    }
    seen.add(categoriaPeso);
    return {
      categoriaPeso,
      cantidadVendida: positiveInteger(detail.cantidadVendida, `detalles[${index}].cantidadVendida`),
    };
  });
}

export function parsePedidoInput(body: unknown): PedidoInput {
  if (!isRecord(body)) {
    throw new AppError(400, "El cuerpo del pedido es inválido");
  }
  return {
    mayoristaId: positiveInteger(body.mayoristaId, "mayoristaId"),
    detalles: parseDetails(body.detalles, "detalles"),
  };
}

export function parseVentaInput(body: unknown): VentaInput {
  if (!isRecord(body)) {
    throw new AppError(400, "El cuerpo de la venta es inválido");
  }
  const detalles = parseVentaDetails(body.detalles);

  if (!Array.isArray(body.distribucion) || body.distribucion.length === 0) {
    throw new AppError(400, "distribucion debe contener al menos una línea");
  }
  const distribucion = body.distribucion.map((item, index) => {
    if (!isRecord(item)) {
      throw new AppError(400, `distribucion[${index}] es inválida`);
    }
    return {
      galponId: positiveInteger(item.galponId, `distribucion[${index}].galponId`),
      categoriaPeso: requiredText(item.categoriaPeso, `distribucion[${index}].categoriaPeso`),
      cantidad: positiveInteger(item.cantidad, `distribucion[${index}].cantidad`),
    };
  });

  return { detalles, distribucion };
}

export function parseId(value: unknown, field: string): number {
  if (typeof value !== "string" || value.trim() === "") {
    throw new AppError(400, `${field} es obligatorio`);
  }
  const id = Number(value);
  return positiveInteger(id, field);
}

export function parseEstado(value: unknown): "cargado" | "entregado" | "cancelado" {
  if (value !== "cargado" && value !== "entregado" && value !== "cancelado") {
    throw new AppError(400, "estado debe ser cargado, entregado o cancelado");
  }
  return value;
}
