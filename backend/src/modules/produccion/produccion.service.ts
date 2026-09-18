import { prisma } from "../../database/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";
import type { ProductionCountInput } from "./produccion.schemas.js";
import type { DailyCloseInput } from "./produccion.schemas.js";

export async function registerCount(input: ProductionCountInput) {
  const [galpon, categoria] = await Promise.all([
    prisma.galpon.findUnique({ where: { id: input.galponId } }),
    prisma.categoriaPeso.findUnique({ where: { codigo: input.categoriaPeso } }),
  ]);

  if (!galpon) {
    throw new AppError(404, "Galpón no encontrado");
  }
  if (!categoria) {
    throw new AppError(404, "Categoría de peso no encontrada");
  }

  return prisma.logConteo.create({
    data: {
      idGalpon: input.galponId,
      codigoCategoriaPeso: input.categoriaPeso,
      cantidad: input.cantidad,
      timestamp: input.timestamp,
    },
  });
}

export async function listCounts() {
  return prisma.logConteo.findMany({
    orderBy: { timestamp: "desc" },
    take: 100,
    include: { galpon: true, categoriaPeso: true },
  });
}

export async function closeDailyProduction(input: DailyCloseInput) {
  const start = new Date(`${input.fecha}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  const counts = await prisma.logConteo.findMany({
    where: {
      timestamp: { gte: start, lt: end },
      ...(input.galponId === undefined ? {} : { idGalpon: input.galponId }),
    },
    select: { idGalpon: true, codigoCategoriaPeso: true, cantidad: true },
  });

  const totals = new Map<string, { idGalpon: number; codigoCategoriaPeso: string; cantidad: number }>();
  for (const count of counts) {
    const key = `${count.idGalpon}:${count.codigoCategoriaPeso}`;
    const current = totals.get(key) ?? {
      idGalpon: count.idGalpon,
      codigoCategoriaPeso: count.codigoCategoriaPeso,
      cantidad: 0,
    };
    current.cantidad += count.cantidad;
    totals.set(key, current);
  }

  const results = [];
  for (const total of totals.values()) {
    if (total.cantidad < 0) {
      throw new AppError(
        409,
        `No se puede cerrar ${total.codigoCategoriaPeso} del galpón ${total.idGalpon}: el total es negativo`,
      );
    }

    const cantidadBandejas = Math.floor(total.cantidad / 30);
    const cantidadSobrante = total.cantidad % 30;
    results.push(await prisma.cierreDiario.upsert({
      where: {
        idGalpon_codigoCategoriaPeso_fecha: {
          idGalpon: total.idGalpon,
          codigoCategoriaPeso: total.codigoCategoriaPeso,
          fecha: start,
        },
      },
      create: {
        idGalpon: total.idGalpon,
        codigoCategoriaPeso: total.codigoCategoriaPeso,
        fecha: start,
        cantidadBandejas,
        cantidadSobrante,
      },
      update: { cantidadBandejas, cantidadSobrante },
    }));
  }

  return results;
}