import { prisma } from "../../database/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";
import type {
  DistribucionInput,
  MayoristaInput,
  PedidoInput,
  PrecioInput,
  VentaInput,
} from "./comercial.schemas.js";

const pedidoInclude = {
  mayorista: true,
  detalles: { include: { categoriaPeso: true } },
  venta: { include: { detalles: true } },
} as const;

export async function listMayoristas() {
  return prisma.mayorista.findMany({ orderBy: { nombre: "asc" } });
}

export async function getMayorista(id: number) {
  const mayorista = await prisma.mayorista.findUnique({ where: { id } });
  if (!mayorista) {
    throw new AppError(404, "Mayorista no encontrado");
  }
  return mayorista;
}

export async function createMayorista(input: MayoristaInput) {
  return prisma.mayorista.create({ data: input });
}

export async function updateMayorista(id: number, input: MayoristaInput) {
  await getMayorista(id);
  return prisma.mayorista.update({ where: { id }, data: input });
}

export async function deleteMayorista(id: number) {
  await getMayorista(id);
  try {
    await prisma.mayorista.delete({ where: { id } });
  } catch {
    throw new AppError(409, "No se puede eliminar un mayorista con pedidos o precios asociados");
  }
}

export async function listPrecios(mayoristaId: number) {
  await getMayorista(mayoristaId);
  return prisma.precio.findMany({
    where: { idMayorista: mayoristaId },
    include: { categoriaPeso: true },
    orderBy: { codigoCategoriaPeso: "asc" },
  });
}

export async function upsertPrecio(mayoristaId: number, input: PrecioInput) {
  await getMayorista(mayoristaId);
  const categoria = await prisma.categoriaPeso.findUnique({ where: { codigo: input.categoriaPeso } });
  if (!categoria) {
    throw new AppError(404, "Categoría de peso no encontrada");
  }

  return prisma.precio.upsert({
    where: {
      idMayorista_codigoCategoriaPeso: {
        idMayorista: mayoristaId,
        codigoCategoriaPeso: input.categoriaPeso,
      },
    },
    create: {
      idMayorista: mayoristaId,
      codigoCategoriaPeso: input.categoriaPeso,
      valorUnitario: input.valorUnitario,
    },
    update: { valorUnitario: input.valorUnitario },
  });
}

export type PedidoFilters = {
  estado?: string;
  mayoristaId?: number;
};

export async function listPedidos(filters: PedidoFilters) {
  return prisma.pedido.findMany({
    where: {
      ...(filters.estado === undefined ? {} : { estado: filters.estado }),
      ...(filters.mayoristaId === undefined ? {} : { idMayorista: filters.mayoristaId }),
    },
    include: pedidoInclude,
    orderBy: { fecha: "desc" },
  });
}

async function validatePedidoDetails(details: PedidoInput["detalles"]) {
  const categories = await prisma.categoriaPeso.findMany({
    where: { codigo: { in: details.map((detail) => detail.categoriaPeso) } },
    select: { codigo: true },
  });
  const available = new Set(categories.map((category) => category.codigo));
  const missing = details.find((detail) => !available.has(detail.categoriaPeso));
  if (missing) {
    throw new AppError(404, `Categoría de peso no encontrada: ${missing.categoriaPeso}`);
  }
}

export async function createPedido(input: PedidoInput) {
  await getMayorista(input.mayoristaId);
  await validatePedidoDetails(input.detalles);

  return prisma.pedido.create({
    data: {
      fecha: new Date(),
      estado: "pendiente",
      idMayorista: input.mayoristaId,
      detalles: { create: input.detalles.map((detail) => ({
        codigoCategoriaPeso: detail.categoriaPeso,
        cantidadSolicitada: detail.cantidadSolicitada,
      })) },
    },
    include: pedidoInclude,
  });
}

export async function getPedido(id: number) {
  const pedido = await prisma.pedido.findUnique({ where: { id }, include: pedidoInclude });
  if (!pedido) {
    throw new AppError(404, "Pedido no encontrado");
  }
  return pedido;
}

export async function updatePedido(id: number, input: PedidoInput) {
  const pedido = await getPedido(id);
  if (pedido.estado !== "pendiente") {
    throw new AppError(409, "Solo se puede editar un pedido pendiente");
  }
  await getMayorista(input.mayoristaId);
  await validatePedidoDetails(input.detalles);

  return prisma.$transaction(async (transaction) => {
    await transaction.detallePedido.deleteMany({ where: { idPedido: id } });
    return transaction.pedido.update({
      where: { id },
      data: {
        idMayorista: input.mayoristaId,
        estado: "pendiente",
        detalles: { create: input.detalles.map((detail) => ({
          codigoCategoriaPeso: detail.categoriaPeso,
          cantidadSolicitada: detail.cantidadSolicitada,
        })) },
      },
      include: pedidoInclude,
    });
  });
}

const transitions: Record<string, string[]> = {
  pendiente: ["cargado", "cancelado"],
  cargado: ["cancelado"],
};

export async function changePedidoStatus(id: number, estado: "cargado" | "entregado" | "cancelado") {
  const pedido = await getPedido(id);
  if (!transitions[pedido.estado]?.includes(estado)) {
    if (estado === "entregado") {
      throw new AppError(409, "Un pedido se entrega al registrar su venta");
    }
    throw new AppError(409, `No se puede cambiar un pedido de ${pedido.estado} a ${estado}`);
  }
  return prisma.pedido.update({ where: { id }, data: { estado }, include: pedidoInclude });
}

function groupDistribution(distribution: DistribucionInput[]) {
  const grouped = new Map<string, DistribucionInput[]>();
  for (const item of distribution) {
    const entries = grouped.get(item.categoriaPeso) ?? [];
    entries.push(item);
    grouped.set(item.categoriaPeso, entries);
  }
  return grouped;
}

export async function createVenta(pedidoId: number, input: VentaInput) {
  return prisma.$transaction(async (transaction) => {
    const pedido = await transaction.pedido.findUnique({
      where: { id: pedidoId },
      include: { detalles: true, venta: true },
    });
    if (!pedido) {
      throw new AppError(404, "Pedido no encontrado");
    }
    if (pedido.estado !== "cargado") {
      throw new AppError(409, "El pedido debe estar cargado para registrar la venta");
    }
    if (pedido.venta) {
      throw new AppError(409, "El pedido ya tiene una venta registrada");
    }

    const requested = new Map(pedido.detalles.map((detail) => [detail.codigoCategoriaPeso, detail.cantidadSolicitada]));
    const sold = new Map<string, number>();
    for (const detail of input.detalles) {
      if (!requested.has(detail.categoriaPeso)) {
        throw new AppError(400, `La categoría ${detail.categoriaPeso} no pertenece al pedido`);
      }
      if (detail.cantidadVendida > requested.get(detail.categoriaPeso)!) {
        throw new AppError(409, `La cantidad vendida de ${detail.categoriaPeso} supera la solicitada`);
      }
      sold.set(detail.categoriaPeso, detail.cantidadVendida);
    }
    if (sold.size !== requested.size || [...requested.keys()].some((category) => !sold.has(category))) {
      throw new AppError(400, "La venta debe incluir exactamente las categorías del pedido");
    }

    const grouped = groupDistribution(input.distribucion);
    for (const [category, quantity] of sold) {
      const distributionTotal = (grouped.get(category) ?? []).reduce((total, item) => total + item.cantidad, 0);
      if (distributionTotal !== quantity) {
        throw new AppError(400, `La distribución de ${category} no coincide con la cantidad vendida`);
      }
    }
    if ([...grouped.keys()].some((category) => !sold.has(category))) {
      throw new AppError(400, "La distribución contiene categorías no vendidas");
    }

    const prices = await transaction.precio.findMany({
      where: {
        idMayorista: pedido.idMayorista,
        codigoCategoriaPeso: { in: [...sold.keys()] },
      },
    });
    const priceByCategory = new Map(prices.map((price) => [price.codigoCategoriaPeso, price.valorUnitario]));
    for (const category of sold.keys()) {
      if (!priceByCategory.has(category)) {
        throw new AppError(409, `No existe precio para la categoría ${category}`);
      }
    }

    for (const item of input.distribucion) {
      const latestStock = await transaction.bodega.findFirst({
        where: { idGalpon: item.galponId, codigoCategoriaPeso: item.categoriaPeso },
        orderBy: { fechaCorte: "desc" },
      });
      if (!latestStock) {
        throw new AppError(409, `No existe inventario para ${item.categoriaPeso} en el galpón ${item.galponId}`);
      }
      const updated = await transaction.bodega.updateMany({
        where: {
          idGalpon: item.galponId,
          codigoCategoriaPeso: item.categoriaPeso,
          fechaCorte: latestStock.fechaCorte,
          cantidadBandejas: { gte: item.cantidad },
        },
        data: { cantidadBandejas: { decrement: item.cantidad } },
      });
      if (updated.count !== 1) {
        throw new AppError(409, `Inventario insuficiente para ${item.categoriaPeso} en el galpón ${item.galponId}`);
      }
    }

    return transaction.venta.create({
      data: {
        fechaHora: new Date(),
        idPedido: pedidoId,
        detalles: {
          create: [...sold.entries()].map(([codigoCategoriaPeso, cantidadVendida]) => ({
            codigoCategoriaPeso,
            cantidadVendida,
            precioAplicado: priceByCategory.get(codigoCategoriaPeso)!,
          })),
        },
      },
      include: { detalles: true },
    }).then(async (venta) => {
      await transaction.pedido.update({ where: { id: pedidoId }, data: { estado: "entregado" } });
      return venta;
    });
  });
}

export async function getVentaByPedido(pedidoId: number) {
  const venta = await prisma.venta.findUnique({ where: { idPedido: pedidoId }, include: { detalles: true } });
  if (!venta) {
    throw new AppError(404, "Venta no encontrada");
  }
  return venta;
}
