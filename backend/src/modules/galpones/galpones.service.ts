import type { Prisma } from "@prisma/client";
import { prisma } from "../../database/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";
import { todayBogota, toDateOnly } from "../../shared/utils/fecha-bogota.js";
import type { CambioGallinasInput } from "./galpones.schemas.js";

const HISTORIAL_ALIMENTACION_DIAS = 30;
const HISTORIAL_CAMBIOS = 20;

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

async function findGalponOrFail(id: number) {
  const galpon = await prisma.galpon.findUnique({ where: { id } });
  if (!galpon) {
    throw new AppError(404, "Galpón no encontrado");
  }
  return galpon;
}

function assertActivo(estado: string): void {
  if (estado !== "activo") {
    throw new AppError(409, "El galpón no está activo");
  }
}

export async function listGalpones() {
  const hoy = toDateOnly(todayBogota());
  const galpones = await prisma.galpon.findMany({
    orderBy: { id: "asc" },
    include: { alimentaciones: { where: { fecha: hoy }, take: 1 } },
  });
  return galpones.map(({ alimentaciones, ...galpon }) => ({
    ...galpon,
    alimentadoHoy: alimentaciones.length > 0,
    alimentadoEn: alimentaciones[0]?.registradoEn ?? null,
  }));
}

export async function getGalpon(id: number) {
  const hoyTexto = todayBogota();
  const hoy = toDateOnly(hoyTexto);
  const desde = new Date(hoy);
  desde.setUTCDate(desde.getUTCDate() - (HISTORIAL_ALIMENTACION_DIAS - 1));

  const galpon = await findGalponOrFail(id);
  const [alimentaciones, cambios] = await Promise.all([
    prisma.registroAlimentacion.findMany({
      where: { idGalpon: id, fecha: { gte: desde, lte: hoy } },
      include: { usuario: { select: { nombre: true } } },
      orderBy: { fecha: "desc" },
    }),
    prisma.auditoria.findMany({
      where: { tablaAfectada: "galpon", idRegistroAfectado: String(id), accion: "UPDATE", resultado: "EXITOSO" },
      include: { usuario: { select: { nombre: true } } },
      orderBy: { fechaHora: "desc" },
      take: HISTORIAL_CAMBIOS,
    }),
  ]);

  const registroHoy = alimentaciones.find((row) => row.fecha.getTime() === hoy.getTime());
  return {
    ...galpon,
    fechaHoy: hoyTexto,
    alimentadoHoy: registroHoy !== undefined,
    alimentadoEn: registroHoy?.registradoEn ?? null,
    alimentaciones: alimentaciones.map((row) => ({
      fecha: row.fecha,
      registradoEn: row.registradoEn,
      usuario: row.usuario.nombre,
    })),
    cambiosGallinas: cambios.map((row) => ({
      id: Number(row.id),
      fechaHora: row.fechaHora,
      usuario: row.usuario.nombre,
      datosAnteriores: row.datosAnteriores,
      datosNuevos: row.datosNuevos,
    })),
  };
}

export async function registrarAlimentacion(id: number, userId: number) {
  const galpon = await findGalponOrFail(id);
  assertActivo(galpon.estado);

  try {
    const registro = await prisma.registroAlimentacion.create({
      data: { idGalpon: id, fecha: toDateOnly(todayBogota()), idUsuario: userId },
    });
    return { idGalpon: registro.idGalpon, fecha: registro.fecha, registradoEn: registro.registradoEn };
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError(409, "Este galpón ya fue alimentado hoy");
    }
    throw error;
  }
}

export async function cambiarGallinas(
  id: number,
  userId: number,
  input: CambioGallinasInput,
  ip: string | undefined,
) {
  return prisma.$transaction(async (transaction) => {
    const anterior = await transaction.galpon.findUnique({ where: { id } });
    if (!anterior) {
      throw new AppError(404, "Galpón no encontrado");
    }
    assertActivo(anterior.estado);

    if (input.tipo === "baja") {
      const updated = await transaction.galpon.updateMany({
        where: { id, gallinasActuales: { gte: input.cantidad } },
        data: { gallinasActuales: { decrement: input.cantidad } },
      });
      if (updated.count === 0) {
        throw new AppError(409, "No hay suficientes gallinas para registrar esa baja");
      }
    } else {
      await transaction.galpon.update({
        where: { id },
        data: { gallinasActuales: { increment: input.cantidad } },
      });
    }

    const actualizado = await transaction.galpon.findUniqueOrThrow({ where: { id } });
    const datosNuevos: Prisma.InputJsonObject = {
      gallinasActuales: actualizado.gallinasActuales,
      tipo: input.tipo,
      cantidad: input.cantidad,
      ...(input.causa === undefined ? {} : { causa: input.causa }),
    };
    await transaction.auditoria.create({
      data: {
        idUsuario: userId,
        tablaAfectada: "galpon",
        idRegistroAfectado: String(id),
        accion: "UPDATE",
        datosAnteriores: { gallinasActuales: anterior.gallinasActuales },
        datosNuevos,
        ...(ip === undefined ? {} : { ipOrigen: ip.slice(0, 45) }),
        resultado: "EXITOSO",
      },
    });
    return actualizado;
  });
}
