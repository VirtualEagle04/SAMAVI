import type { Prisma } from "@prisma/client";
import { prisma } from "../../database/prisma.js";
import { startOfDayBogota } from "../../shared/utils/fecha-bogota.js";
import type { AuditoriaFilters } from "./auditoria.schemas.js";

function siguienteDia(fecha: string): string {
  const date = new Date(`${fecha}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function buildWhere(filters: AuditoriaFilters): Prisma.AuditoriaWhereInput {
  const fechaHora: Prisma.DateTimeFilter = {
    ...(filters.desde === undefined ? {} : { gte: startOfDayBogota(filters.desde) }),
    ...(filters.hasta === undefined ? {} : { lt: startOfDayBogota(siguienteDia(filters.hasta)) }),
  };
  return {
    ...(filters.tabla === undefined ? {} : { tablaAfectada: filters.tabla }),
    ...(filters.accion === undefined ? {} : { accion: filters.accion }),
    ...(filters.usuarioId === undefined ? {} : { idUsuario: filters.usuarioId }),
    ...(filters.registro === undefined ? {} : { idRegistroAfectado: filters.registro }),
    ...(filters.desde === undefined && filters.hasta === undefined ? {} : { fechaHora }),
  };
}

export async function listAuditoria(filters: AuditoriaFilters) {
  const where = buildWhere(filters);
  const [rows, total] = await Promise.all([
    prisma.auditoria.findMany({
      where,
      include: { usuario: { select: { id: true, nombre: true } } },
      orderBy: [{ fechaHora: "desc" }, { id: "desc" }],
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
    }),
    prisma.auditoria.count({ where }),
  ]);

  const items = rows.map((row) => ({
    id: row.id.toString(),
    fechaHora: row.fechaHora,
    usuario: row.usuario,
    tabla: row.tablaAfectada,
    registro: row.idRegistroAfectado,
    accion: row.accion,
    resultado: row.resultado,
    ip: row.ipOrigen,
    antes: row.datosAnteriores,
    despues: row.datosNuevos,
  }));
  return { items, page: filters.page, limit: filters.limit, total };
}

/** Valores con registros, para alimentar los filtros del visor. */
export async function getAuditoriaOpciones() {
  const [tablas, usuarios] = await Promise.all([
    prisma.auditoria.findMany({
      distinct: ["tablaAfectada"],
      select: { tablaAfectada: true },
      orderBy: { tablaAfectada: "asc" },
    }),
    prisma.usuario.findMany({
      where: { auditorias: { some: {} } },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
  ]);
  return { tablas: tablas.map((row) => row.tablaAfectada), usuarios };
}
