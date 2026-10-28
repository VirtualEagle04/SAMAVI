import { describe, it, expect, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import type { Request } from "express";
import { auditContext, registrarAuditoria } from "../../../src/shared/audit/auditoria.js";
import { AppError } from "../../../src/shared/errors/app-error.js";

function transactionMock() {
  const create = vi.fn();
  return { create, transaction: { auditoria: { create } } as unknown as Prisma.TransactionClient };
}

describe("registrarAuditoria", () => {
  it("escribe un registro exitoso con antes, después e IP recortada a 45 caracteres", async () => {
    const { create, transaction } = transactionMock();

    await registrarAuditoria(transaction, { userId: 3, ip: "x".repeat(60) }, {
      tabla: "precio",
      idRegistro: 7,
      accion: "UPDATE",
      antes: { valorUnitario: 100 },
      despues: { valorUnitario: 120 },
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        idUsuario: 3,
        tablaAfectada: "precio",
        idRegistroAfectado: "7",
        accion: "UPDATE",
        datosAnteriores: { valorUnitario: 100 },
        datosNuevos: { valorUnitario: 120 },
        ipOrigen: "x".repeat(45),
        resultado: "EXITOSO",
      },
    });
  });

  it("omite los campos que no se envían", async () => {
    const { create, transaction } = transactionMock();

    await registrarAuditoria(transaction, { userId: 1, ip: undefined }, { tabla: "gasto", idRegistro: "4", accion: "DELETE" });

    expect(create).toHaveBeenCalledWith({
      data: { idUsuario: 1, tablaAfectada: "gasto", idRegistroAfectado: "4", accion: "DELETE", resultado: "EXITOSO" },
    });
  });
});

describe("auditContext", () => {
  it("toma el usuario autenticado y la IP de la petición", () => {
    const request = { auth: { id: 5, rol: "Administrador", rolId: 1 }, ip: "::1" } as unknown as Request;
    expect(auditContext(request)).toEqual({ userId: 5, ip: "::1" });
  });

  it("lanza 401 sin usuario autenticado", () => {
    expect(() => auditContext({} as Request)).toThrow(AppError);
  });
});
