import { prisma } from "../../database/prisma.js";
import type { Prisma } from "@prisma/client";
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
  venta: { include: { detalles: { include: { distribuciones: { include: { galpon: true } } } } } },
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

type StockReader = Pick<Prisma.TransactionClient, "bodega" | "cierreDiario" | "cierreProduccionDia" | "detalleVentaGalpon" | "galpon">;

async function getStockByBarnAndCategory(reader: StockReader, fecha: Date, galponIds?: number[]) {
  const day = new Date(`${fecha.toISOString().slice(0, 10)}T00:00:00.000Z`);
  const tomorrow = new Date(day);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const closedBarns = await reader.cierreProduccionDia.findMany({
    where: { fecha: day, ...(galponIds ? { idGalpon: { in: galponIds } } : {}) },
    include: { galpon: true },
  });
  const barns = closedBarns.map(({ idGalpon, galpon }) => ({ id: idGalpon, nombre: galpon.nombre }));
  if (!barns.length) return { barns, stock: new Map<string, number>() };

  const ids = barns.map((barn) => barn.id);
  const [snapshots, closes, dispatches] = await Promise.all([
    reader.bodega.findMany({ where: { idGalpon: { in: ids }, fechaCorte: { lte: day } }, orderBy: { fechaCorte: "desc" } }),
    reader.cierreDiario.findMany({
      where: { idGalpon: { in: ids }, fecha: { lte: day } },
      orderBy: { fecha: "asc" },
    }),
    reader.detalleVentaGalpon.findMany({
      where: { idGalpon: { in: ids }, detalleVenta: { venta: { fechaHora: { lt: tomorrow } } } },
      include: { detalleVenta: { include: { venta: true } } },
    }),
  ]);
  const closedToday = new Set(closedBarns.map((barn) => barn.idGalpon));
  const latestSnapshot = new Map<string, { fecha: Date; cantidad: number }>();
  for (const row of snapshots) {
    const key = `${row.idGalpon}:${row.codigoCategoriaPeso}`;
    if (!latestSnapshot.has(key)) latestSnapshot.set(key, { fecha: row.fechaCorte, cantidad: row.cantidadBandejas });
  }
  const stock = new Map<string, number>();
  const keyFor = (barn: number, category: string) => `${barn}:${category}`;
  for (const [key, snapshot] of latestSnapshot) stock.set(key, snapshot.cantidad);
  for (const close of closes) {
    if (!closedToday.has(close.idGalpon)) continue;
    const key = keyFor(close.idGalpon, close.codigoCategoriaPeso);
    const snapshot = latestSnapshot.get(key);
    if (!snapshot || close.fecha > snapshot.fecha) {
      stock.set(key, (stock.get(key) ?? 0) + close.cantidadBandejas);
    }
  }
  for (const dispatch of dispatches) {
    const key = keyFor(dispatch.idGalpon, dispatch.codigoCategoriaPeso);
    const snapshot = latestSnapshot.get(key);
    const soldDate = dispatch.detalleVenta.venta.fechaHora;
    if (!snapshot || soldDate > snapshot.fecha) stock.set(key, (stock.get(key) ?? 0) - dispatch.cantidad);
  }
  return { barns, stock };
}

function recommendAllocation(capacities: { id: number; available: number }[], requested: number) {
  const total = capacities.reduce((sum, barn) => sum + barn.available, 0);
  const target = Math.min(requested, total);
  if (target === 0 || total === 0) return capacities.map(({ id, available }) => ({ id, available, recommended: 0 }));
  const allocations = capacities.map(({ id, available }) => {
    const exact = target * available / total;
    const amount = Math.min(available, Math.floor(exact));
    return { id, available, recommended: amount, remainder: exact - Math.floor(exact) };
  });
  let remaining = target - allocations.reduce((sum, barn) => sum + barn.recommended, 0);
  allocations.sort((a, b) => b.remainder - a.remainder || a.id - b.id);
  for (const barn of allocations) {
    if (!remaining) break;
    if (barn.recommended < barn.available) { barn.recommended += 1; remaining -= 1; }
  }
  return allocations.sort((a, b) => a.id - b.id).map(({ id, available, recommended }) => ({ id, available, recommended }));
}

export async function getPedidoDisponibilidad(pedidoId: number) {
  const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId }, include: { detalles: { include: { categoriaPeso: true } } } });
  if (!pedido) throw new AppError(404, "Pedido no encontrado");
  const today = new Date();
  const { barns, stock } = await prisma.$transaction((transaction) => getStockByBarnAndCategory(transaction, today));
  const items = pedido.detalles.map((detail) => {
    const capacities = barns.map((barn) => ({ id: barn.id, available: Math.max(0, stock.get(`${barn.id}:${detail.codigoCategoriaPeso}`) ?? 0) }));
    const allocation = recommendAllocation(capacities, detail.cantidadSolicitada);
    const available = capacities.reduce((sum, barn) => sum + barn.available, 0);
    return {
      categoriaPeso: detail.codigoCategoriaPeso,
      nombre: detail.categoriaPeso.nombre,
      cantidadSolicitada: detail.cantidadSolicitada,
      cantidadDisponible: available,
      cantidadRecomendada: Math.min(detail.cantidadSolicitada, available),
      cantidadNoEntregada: Math.max(0, detail.cantidadSolicitada - available),
      galpones: allocation.map((barn) => ({ galponId: barn.id, nombre: barns.find((candidate) => candidate.id === barn.id)!.nombre, disponible: barn.available, recomendada: barn.recommended })),
    };
  });
  return { fecha: today.toISOString().slice(0, 10), cierreRealizado: barns.length > 0, categorias: items };
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
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(74129031)`;
    const pedido = await transaction.pedido.findUnique({
      where: { id: pedidoId },
      include: { detalles: true, venta: true },
    });
    if (!pedido) {
      throw new AppError(404, "Pedido no encontrado");
    }
    if (pedido.estado !== "pendiente" && pedido.estado !== "cargado") {
      throw new AppError(409, "El pedido no está disponible para cargar");
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

    const stockResult = await getStockByBarnAndCategory(transaction, new Date(), [...new Set(input.distribucion.map((row) => row.galponId))]);
    if (!stockResult.barns.length) {
      throw new AppError(409, "Primero se debe cerrar la producción diaria de al menos un galpón");
    }
    const todayBarns = new Set(stockResult.barns.map((barn) => barn.id));
    for (const item of input.distribucion) {
      if (!todayBarns.has(item.galponId)) {
        throw new AppError(409, `El galpón ${item.galponId} no tiene cierre diario registrado para hoy`);
      }
      const available = stockResult.stock.get(`${item.galponId}:${item.categoriaPeso}`) ?? 0;
      if (item.cantidad > available) {
        throw new AppError(409, `Solo hay ${Math.max(0, available)} bandejas de ${item.categoriaPeso} disponibles en el galpón ${item.galponId}`);
      }
    }
    const totalAvailableByCategory = new Map<string, number>();
    for (const category of requested.keys()) {
      totalAvailableByCategory.set(category, stockResult.barns.reduce((sum, barn) => sum + Math.max(0, stockResult.stock.get(`${barn.id}:${category}`) ?? 0), 0));
    }
    for (const [category, quantity] of sold) {
      const available = totalAvailableByCategory.get(category) ?? 0;
      if (quantity > available) throw new AppError(409, `Solo hay ${available} bandejas de ${category} disponibles para este pedido`);
      if (quantity !== Math.min(requested.get(category)!, available)) {
        throw new AppError(409, `La cantidad cargada de ${category} debe ser ${Math.min(requested.get(category)!, available)} según la existencia disponible`);
      }
    }

    const missingByCategory = new Map([...requested].map(([category, quantity]) => [category, quantity - (sold.get(category) ?? 0)]));
    const venta = await transaction.venta.create({
      data: {
        fechaHora: new Date(),
        idPedido: pedidoId,
        detalles: {
          create: [...sold.entries()].map(([codigoCategoriaPeso, cantidadVendida]) => ({
            codigoCategoriaPeso,
            cantidadVendida,
            cantidadNoEntregada: missingByCategory.get(codigoCategoriaPeso) ?? 0,
            motivoNoEntrega: (missingByCategory.get(codigoCategoriaPeso) ?? 0) > 0 ? "sin_existencia" : null,
            precioAplicado: priceByCategory.get(codigoCategoriaPeso)!,
            distribuciones: {
              create: input.distribucion.filter((row) => row.categoriaPeso === codigoCategoriaPeso).map((row) => ({ idGalpon: row.galponId, cantidad: row.cantidad })),
            },
          })),
        },
      },
      include: { detalles: { include: { distribuciones: { include: { galpon: true } } } } },
    });
    const partial = [...missingByCategory.values()].some((quantity) => quantity > 0);
    await transaction.pedido.update({ where: { id: pedidoId }, data: { estado: partial ? "entregado_parcial" : "entregado" } });
    return venta;
  });
}

export async function getVentaByPedido(pedidoId: number) {
  const venta = await prisma.venta.findUnique({ where: { idPedido: pedidoId }, include: { detalles: { include: { distribuciones: { include: { galpon: true } } } } } });
  if (!venta) {
    throw new AppError(404, "Venta no encontrada");
  }
  return venta;
}
