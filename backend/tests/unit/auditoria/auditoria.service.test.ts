import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "../../../src/database/prisma.js";
import { getAuditoriaOpciones, listAuditoria } from "../../../src/modules/auditoria/auditoria.service.js";

vi.mock("../../../src/database/prisma.js", () => ({
  prisma: {
    auditoria: { findMany: vi.fn(), count: vi.fn() },
    usuario: { findMany: vi.fn() },
  },
}));

const mocked = prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;

beforeEach(() => {
  vi.clearAllMocks();
  mocked.auditoria!.findMany!.mockResolvedValue([]);
  mocked.auditoria!.count!.mockResolvedValue(0);
});

describe("listAuditoria", () => {
  it("serializa el id BigInt y renombra los campos", async () => {
    const fechaHora = new Date("2026-10-27T15:00:00.000Z");
    mocked.auditoria!.findMany!.mockResolvedValue([{
      id: 12n,
      fechaHora,
      usuario: { id: 1, nombre: "Admin" },
      tablaAfectada: "pedido",
      idRegistroAfectado: "4",
      accion: "UPDATE",
      resultado: "EXITOSO",
      ipOrigen: "::1",
      datosAnteriores: { estado: "pendiente" },
      datosNuevos: { estado: "cargado" },
    }]);
    mocked.auditoria!.count!.mockResolvedValue(1);

    await expect(listAuditoria({ page: 1, limit: 25 })).resolves.toEqual({
      items: [{
        id: "12",
        fechaHora,
        usuario: { id: 1, nombre: "Admin" },
        tabla: "pedido",
        registro: "4",
        accion: "UPDATE",
        resultado: "EXITOSO",
        ip: "::1",
        antes: { estado: "pendiente" },
        despues: { estado: "cargado" },
      }],
      page: 1,
      limit: 25,
      total: 1,
    });
  });

  it("aplica filtros, paginación y el rango de fechas en hora de Bogotá", async () => {
    await listAuditoria({
      tabla: "gasto",
      accion: "DELETE",
      usuarioId: 2,
      registro: "9",
      desde: "2026-10-01",
      hasta: "2026-10-27",
      page: 3,
      limit: 10,
    });

    const where = {
      tablaAfectada: "gasto",
      accion: "DELETE",
      idUsuario: 2,
      idRegistroAfectado: "9",
      fechaHora: {
        gte: new Date("2026-10-01T05:00:00.000Z"),
        lt: new Date("2026-10-28T05:00:00.000Z"),
      },
    };
    expect(mocked.auditoria!.findMany).toHaveBeenCalledWith(expect.objectContaining({ where, skip: 20, take: 10 }));
    expect(mocked.auditoria!.count).toHaveBeenCalledWith({ where });
  });

  it("no filtra por fecha si no se envía ninguna", async () => {
    await listAuditoria({ page: 1, limit: 25 });
    expect(mocked.auditoria!.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });
});

describe("getAuditoriaOpciones", () => {
  it("devuelve las tablas distintas y los usuarios con registros", async () => {
    mocked.auditoria!.findMany!.mockResolvedValue([{ tablaAfectada: "galpon" }, { tablaAfectada: "pedido" }]);
    mocked.usuario!.findMany!.mockResolvedValue([{ id: 1, nombre: "Admin" }]);

    await expect(getAuditoriaOpciones()).resolves.toEqual({
      tablas: ["galpon", "pedido"],
      usuarios: [{ id: 1, nombre: "Admin" }],
    });
    expect(mocked.usuario!.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { auditorias: { some: {} } } }));
  });
});
