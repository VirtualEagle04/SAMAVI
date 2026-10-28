import { prisma } from "../../database/prisma.js";
import type { Prisma } from "@prisma/client";
import { type AuditContext, registrarAuditoria } from "../../shared/audit/auditoria.js";
import { AppError } from "../../shared/errors/app-error.js";
import type {
  CompraInput,
  InsumoInput,
  InventarioFilters,
  MovimientoInput,
  ProveedorInput,
} from "./inventario.schemas.js";

const manualMovementCodes = new Set([
  "AJUSTE_POS",
  "DEVOLUCION",
  "CONSUMO_GALPON",
  "AJUSTE_NEG",
  "MERMA",
]);

function toNumber(value: { toNumber(): number } | number): number {
  return typeof value === "number" ? value : value.toNumber();
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function movementStock(movements: Array<{ cantidad: { toNumber(): number }; tipoMovimiento: { efecto: string } }>): number {
  return movements.reduce(
    (stock, movement) => stock + toNumber(movement.cantidad) * (movement.tipoMovimiento.efecto === "entrada" ? 1 : -1),
    0,
  );
}

async function getStockForInsumo(reader: typeof prisma, insumoId: number): Promise<number> {
  const movements = await reader.movimientoInsumo.findMany({
    where: { idInsumo: insumoId },
    select: { cantidad: true, tipoMovimiento: { select: { efecto: true } } },
  });
  return movementStock(movements);
}

async function getStockForInsumoInTransaction(transaction: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], insumoId: number): Promise<number> {
  const movements = await transaction.movimientoInsumo.findMany({
    where: { idInsumo: insumoId },
    select: { cantidad: true, tipoMovimiento: { select: { efecto: true } } },
  });
  return movementStock(movements);
}

function stockResponse(insumo: { id: number; codigo: string; nombre: string; unidadMedida: string; stockMinimo: { toNumber(): number }; costo: { toNumber(): number }; activo: boolean }, stock: number) {
  return {
    id: insumo.id,
    codigo: insumo.codigo,
    nombre: insumo.nombre,
    unidadMedida: insumo.unidadMedida,
    stock: roundMoney(stock),
    stockMinimo: toNumber(insumo.stockMinimo),
    costo: toNumber(insumo.costo),
    valorInventario: roundMoney(stock * toNumber(insumo.costo)),
    activo: insumo.activo,
  };
}

export async function listInsumos() {
  const insumos = await prisma.insumo.findMany({
    orderBy: { nombre: "asc" },
    include: { movimientos: { include: { tipoMovimiento: true } } },
  });
  return insumos.map(({ movimientos, ...insumo }) => stockResponse(insumo, movementStock(movimientos)));
}

export async function getInsumo(id: number) {
  const insumo = await prisma.insumo.findUnique({
    where: { id },
    include: { movimientos: { include: { tipoMovimiento: true } } },
  });
  if (!insumo) throw new AppError(404, "Insumo no encontrado");
  const { movimientos, ...data } = insumo;
  return stockResponse(data, movementStock(movimientos));
}

type InsumoRow = {
  codigo: string;
  nombre: string;
  descripcion: string | null;
  unidadMedida: string;
  stockMinimo: { toNumber(): number };
  costo: { toNumber(): number };
  activo: boolean;
};

function insumoSnapshot(insumo: InsumoRow): Prisma.InputJsonObject {
  return {
    codigo: insumo.codigo,
    nombre: insumo.nombre,
    descripcion: insumo.descripcion,
    unidadMedida: insumo.unidadMedida,
    stockMinimo: insumo.stockMinimo.toNumber(),
    costo: insumo.costo.toNumber(),
    activo: insumo.activo,
  };
}

type ProveedorRow = { nombre: string; contacto: Prisma.JsonValue; activo: boolean };

function proveedorSnapshot(proveedor: ProveedorRow): Prisma.InputJsonObject {
  return { nombre: proveedor.nombre, contacto: proveedor.contacto, activo: proveedor.activo };
}

async function findInsumoOrFail(id: number) {
  const insumo = await prisma.insumo.findUnique({ where: { id } });
  if (!insumo) throw new AppError(404, "Insumo no encontrado");
  return insumo;
}

async function findProveedorOrFail(id: number) {
  const provider = await prisma.proveedor.findUnique({ where: { id } });
  if (!provider) throw new AppError(404, "Proveedor no encontrado");
  return provider;
}

export async function createInsumo(input: InsumoInput, context: AuditContext) {
  try {
    return await prisma.$transaction(async (transaction) => {
      const insumo = await transaction.insumo.create({
        data: {
          codigo: input.codigo,
          nombre: input.nombre,
          unidadMedida: input.unidadMedida,
          stockMinimo: input.stockMinimo,
          ...(input.descripcion === undefined ? {} : { descripcion: input.descripcion }),
          ...(input.costo === undefined ? {} : { costo: input.costo }),
        },
      });
      await registrarAuditoria(transaction, context, {
        tabla: "insumo",
        idRegistro: insumo.id,
        accion: "INSERT",
        despues: insumoSnapshot(insumo),
      });
      return insumo;
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      throw new AppError(409, "El código del insumo ya existe");
    }
    throw error;
  }
}

export async function updateInsumo(id: number, input: InsumoInput, context: AuditContext) {
  const anterior = await findInsumoOrFail(id);
  try {
    return await prisma.$transaction(async (transaction) => {
      const insumo = await transaction.insumo.update({
        where: { id },
        data: {
          codigo: input.codigo,
          nombre: input.nombre,
          unidadMedida: input.unidadMedida,
          stockMinimo: input.stockMinimo,
          ...(input.descripcion === undefined ? {} : { descripcion: input.descripcion }),
          ...(input.costo === undefined ? {} : { costo: input.costo }),
        },
      });
      await registrarAuditoria(transaction, context, {
        tabla: "insumo",
        idRegistro: id,
        accion: "UPDATE",
        antes: insumoSnapshot(anterior),
        despues: insumoSnapshot(insumo),
      });
      return insumo;
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      throw new AppError(409, "El código del insumo ya existe");
    }
    throw error;
  }
}

export async function setInsumoActive(id: number, activo: boolean, context: AuditContext) {
  const anterior = await findInsumoOrFail(id);
  return prisma.$transaction(async (transaction) => {
    const insumo = await transaction.insumo.update({ where: { id }, data: { activo } });
    await registrarAuditoria(transaction, context, {
      tabla: "insumo",
      idRegistro: id,
      accion: "UPDATE",
      antes: { activo: anterior.activo },
      despues: { activo },
    });
    return insumo;
  });
}

export async function deleteInsumo(id: number, context: AuditContext) {
  const anterior = await findInsumoOrFail(id);
  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.insumo.delete({ where: { id } });
      await registrarAuditoria(transaction, context, {
        tabla: "insumo",
        idRegistro: id,
        accion: "DELETE",
        antes: insumoSnapshot(anterior),
      });
    });
  } catch {
    throw new AppError(409, "No se puede eliminar un insumo con compras o movimientos asociados");
  }
}

export async function listStock(filters: Pick<InventarioFilters, "insumoId"> = {}) {
  const where: Prisma.InsumoWhereInput = filters.insumoId === undefined ? {} : { id: filters.insumoId };
  const insumos = await prisma.insumo.findMany({
    where,
    orderBy: { nombre: "asc" },
    include: { movimientos: { include: { tipoMovimiento: true } } },
  });
  return insumos.map(({ movimientos, ...insumo }) => stockResponse(insumo, movementStock(movimientos)));
}

export async function getStock(id: number) {
  const insumo = await prisma.insumo.findUnique({ where: { id } });
  if (!insumo) throw new AppError(404, "Insumo no encontrado");
  return stockResponse(insumo, await getStockForInsumo(prisma, id));
}

export async function listMovimientos(insumoId: number, filters: InventarioFilters) {
  await getInsumo(insumoId);
  const where = {
    idInsumo: insumoId,
    ...(filters.galponId === undefined ? {} : { idGalpon: filters.galponId }),
    ...(filters.tipoMovimiento === undefined ? {} : { codigoTipoMovimiento: filters.tipoMovimiento }),
    ...(filters.fechaDesde || filters.fechaHasta
      ? { fecha: { ...(filters.fechaDesde ? { gte: filters.fechaDesde } : {}), ...(filters.fechaHasta ? { lte: filters.fechaHasta } : {}) } }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.movimientoInsumo.findMany({
      where,
      include: { tipoMovimiento: true, compra: { include: { proveedor: true } }, insumo: true },
      orderBy: { fecha: "desc" },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
    }),
    prisma.movimientoInsumo.count({ where }),
  ]);
  return { items, page: filters.page, limit: filters.limit, total };
}

export async function listProveedores() {
  return prisma.proveedor.findMany({ orderBy: { nombre: "asc" } });
}

export async function createProveedor(input: ProveedorInput, context: AuditContext) {
  return prisma.$transaction(async (transaction) => {
    const proveedor = await transaction.proveedor.create({
      data: {
        nombre: input.nombre,
        ...(input.contacto === undefined ? {} : { contacto: input.contacto }),
      },
    });
    await registrarAuditoria(transaction, context, {
      tabla: "proveedor",
      idRegistro: proveedor.id,
      accion: "INSERT",
      despues: proveedorSnapshot(proveedor),
    });
    return proveedor;
  });
}

export async function updateProveedor(id: number, input: ProveedorInput, context: AuditContext) {
  const anterior = await findProveedorOrFail(id);
  return prisma.$transaction(async (transaction) => {
    const proveedor = await transaction.proveedor.update({
      where: { id },
      data: {
        nombre: input.nombre,
        ...(input.contacto === undefined ? {} : { contacto: input.contacto }),
      },
    });
    await registrarAuditoria(transaction, context, {
      tabla: "proveedor",
      idRegistro: id,
      accion: "UPDATE",
      antes: proveedorSnapshot(anterior),
      despues: proveedorSnapshot(proveedor),
    });
    return proveedor;
  });
}

export async function setProveedorActive(id: number, activo: boolean, context: AuditContext) {
  const anterior = await findProveedorOrFail(id);
  return prisma.$transaction(async (transaction) => {
    const proveedor = await transaction.proveedor.update({ where: { id }, data: { activo } });
    await registrarAuditoria(transaction, context, {
      tabla: "proveedor",
      idRegistro: id,
      accion: "UPDATE",
      antes: { activo: anterior.activo },
      despues: { activo },
    });
    return proveedor;
  });
}

export async function deleteProveedor(id: number, context: AuditContext) {
  const anterior = await findProveedorOrFail(id);
  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.proveedor.delete({ where: { id } });
      await registrarAuditoria(transaction, context, {
        tabla: "proveedor",
        idRegistro: id,
        accion: "DELETE",
        antes: proveedorSnapshot(anterior),
      });
    });
  } catch {
    throw new AppError(409, "No se puede eliminar un proveedor con compras asociadas");
  }
}

export async function listCompras(filters: InventarioFilters) {
  const where = {
    ...(filters.insumoId === undefined ? {} : { detalles: { some: { idInsumo: filters.insumoId } } }),
    ...(filters.fechaDesde || filters.fechaHasta
      ? { fecha: { ...(filters.fechaDesde ? { gte: filters.fechaDesde } : {}), ...(filters.fechaHasta ? { lte: filters.fechaHasta } : {}) } }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.compraInsumo.findMany({
      where,
      include: { proveedor: true, detalles: { include: { insumo: true } } },
      orderBy: { fecha: "desc" },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
    }),
    prisma.compraInsumo.count({ where }),
  ]);
  return { items, page: filters.page, limit: filters.limit, total };
}

export async function getCompraReceipt(id: number) {
  const compra = await prisma.compraInsumo.findUnique({
    where: { id },
    select: { reciboImagen: true, reciboMimeType: true, reciboNombreArchivo: true },
  });
  if (!compra) throw new AppError(404, "Compra no encontrada");
  if (!compra.reciboImagen || !compra.reciboMimeType) throw new AppError(404, "La compra no tiene recibo adjunto");
  return compra;
}

export async function createCompra(input: CompraInput, context: AuditContext, file?: Express.Multer.File) {
  const userId = context.userId;
  const detailsTotal = input.detalles.reduce((sum, detail) => sum + detail.cantidad * detail.costoUnitario, 0);
  if (Math.abs(roundMoney(detailsTotal) - roundMoney(input.total)) > 0.01) {
    throw new AppError(400, "total no coincide con la suma de los detalles");
  }

  return prisma.$transaction(async (transaction) => {
    const [provider, user, insumos] = await Promise.all([
      transaction.proveedor.findUnique({ where: { id: input.proveedorId } }),
      transaction.usuario.findUnique({ where: { id: userId } }),
      transaction.insumo.findMany({ where: { id: { in: input.detalles.map((detail) => detail.insumoId) } } }),
    ]);
    if (!provider || !provider.activo) throw new AppError(404, "Proveedor no encontrado o inactivo");
    if (!user) throw new AppError(401, "Usuario no encontrado");
    if (insumos.length !== input.detalles.length) throw new AppError(404, "Uno o más insumos no fueron encontrados");

    const compra = await transaction.compraInsumo.create({
      data: {
        fecha: input.fecha,
        idProveedor: input.proveedorId,
        ...(input.numeroFactura === undefined ? {} : { numeroFactura: input.numeroFactura }),
        ...(input.observaciones === undefined ? {} : { observaciones: input.observaciones }),
        total: input.total,
        ...(file ? {
          reciboImagen: Buffer.from(file.buffer) as unknown as Uint8Array<ArrayBuffer>,
          reciboMimeType: file.mimetype,
          reciboNombreArchivo: file.originalname,
        } : {}),
        detalles: {
          create: input.detalles.map((detail) => ({
            idInsumo: detail.insumoId,
            cantidad: detail.cantidad,
            costoUnitario: detail.costoUnitario,
            subtotal: roundMoney(detail.cantidad * detail.costoUnitario),
            ...(detail.lote === undefined ? {} : { lote: detail.lote }),
            ...(detail.fechaVencimiento === undefined ? {} : { fechaVencimiento: new Date(detail.fechaVencimiento) }),
          })),
        },
      },
    });

    for (const detail of input.detalles) {
      const insumo = insumos.find((item) => item.id === detail.insumoId)!;
      const previousStock = await getStockForInsumoInTransaction(transaction, detail.insumoId);
      const nextCost = previousStock + detail.cantidad === 0
        ? detail.costoUnitario
        : ((previousStock * toNumber(insumo.costo)) + (detail.cantidad * detail.costoUnitario)) / (previousStock + detail.cantidad);
      await transaction.insumo.update({ where: { id: detail.insumoId }, data: { costo: roundMoney(nextCost) } });
      await transaction.movimientoInsumo.create({
        data: {
          idInsumo: detail.insumoId,
          codigoTipoMovimiento: "COMPRA",
          cantidad: detail.cantidad,
          costoUnitario: detail.costoUnitario,
          idCompra: compra.id,
          idUsuario: userId,
        },
      });
    }
    await registrarAuditoria(transaction, context, {
      tabla: "compra_insumo",
      idRegistro: compra.id,
      accion: "INSERT",
      despues: {
        fecha: input.fecha.toISOString(),
        idProveedor: input.proveedorId,
        numeroFactura: input.numeroFactura ?? null,
        total: input.total,
        detalles: input.detalles.map((detail) => ({
          insumoId: detail.insumoId,
          cantidad: detail.cantidad,
          costoUnitario: detail.costoUnitario,
        })),
        recibo: file?.originalname ?? null,
      },
    });
    return transaction.compraInsumo.findUnique({
      where: { id: compra.id },
      include: { proveedor: true, detalles: { include: { insumo: true } } },
    });
  });
}

export async function createMovimiento(input: MovimientoInput, context: AuditContext) {
  const userId = context.userId;
  if (!manualMovementCodes.has(input.codigoTipoMovimiento)) {
    throw new AppError(400, "El tipo de movimiento no puede registrarse manualmente");
  }
  return prisma.$transaction(async (transaction) => {
    const [type, insumo, user] = await Promise.all([
      transaction.tipoMovimientoInsumo.findUnique({ where: { codigo: input.codigoTipoMovimiento } }),
      transaction.insumo.findUnique({ where: { id: input.insumoId } }),
      transaction.usuario.findUnique({ where: { id: userId } }),
    ]);
    if (!type) throw new AppError(404, "Tipo de movimiento no encontrado");
    if (!insumo || !insumo.activo) throw new AppError(404, "Insumo no encontrado o inactivo");
    if (!user) throw new AppError(401, "Usuario no encontrado");
    if (input.codigoTipoMovimiento === "CONSUMO_GALPON" && input.galponId === undefined) {
      throw new AppError(400, "galponId es obligatorio para el consumo en galpón");
    }
    if (input.galponId !== undefined) {
      const galpon = await transaction.galpon.findUnique({ where: { id: input.galponId } });
      if (!galpon) throw new AppError(404, "Galpón no encontrado");
    }

    const stock = await getStockForInsumoInTransaction(transaction, input.insumoId);
    if (type.efecto === "salida" && input.cantidad > stock) {
      throw new AppError(409, `Stock insuficiente. Disponible: ${roundMoney(stock)}`);
    }
    const movimiento = await transaction.movimientoInsumo.create({
      data: {
        idInsumo: input.insumoId,
        codigoTipoMovimiento: input.codigoTipoMovimiento,
        ...(input.galponId === undefined ? {} : { idGalpon: input.galponId }),
        cantidad: input.cantidad,
        ...(input.costoUnitario === undefined ? { costoUnitario: insumo.costo } : { costoUnitario: input.costoUnitario }),
        ...(input.idCierreDiario === undefined ? {} : { idCierreDiario: input.idCierreDiario }),
        ...(input.observaciones === undefined ? {} : { observaciones: input.observaciones }),
        idUsuario: userId,
      },
      include: { tipoMovimiento: true, insumo: true },
    });
    await registrarAuditoria(transaction, context, {
      tabla: "movimiento_insumo",
      idRegistro: movimiento.id.toString(),
      accion: "INSERT",
      despues: {
        insumoId: input.insumoId,
        tipoMovimiento: input.codigoTipoMovimiento,
        cantidad: input.cantidad,
        costoUnitario: movimiento.costoUnitario?.toNumber() ?? null,
        galponId: input.galponId ?? null,
        observaciones: input.observaciones ?? null,
        stockAnterior: roundMoney(stock),
      },
    });
    return movimiento;
  });
}
