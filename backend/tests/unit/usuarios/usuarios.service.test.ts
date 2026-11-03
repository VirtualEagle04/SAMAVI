import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import {
  borrarRol,
  cambiarEstadoUsuario,
  crearRol,
  crearUsuario,
  editarDescripcionPermiso,
  editarRol,
  editarUsuario,
  type Gestor,
  listRoles,
  listUsuarios,
  restablecerPassword,
} from "../../../src/modules/usuarios/usuarios.service.js";
import { prisma } from "../../../src/database/prisma.js";
import type { AppError } from "../../../src/shared/errors/app-error.js";

vi.mock("../../../src/database/prisma.js", () => {
  const client = {
    usuario: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() },
    rol: { findUnique: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    rolPermiso: { deleteMany: vi.fn(), createMany: vi.fn() },
    permiso: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    auditoria: { create: vi.fn() },
    $transaction: vi.fn(),
  };
  client.$transaction.mockImplementation((callback: (tx: unknown) => unknown) => callback(client));
  return { prisma: client };
});

vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn() },
}));

type Mocks = Record<string, ReturnType<typeof vi.fn>>;
const db = prisma as unknown as {
  usuario: Mocks;
  rol: Mocks;
  rolPermiso: Mocks;
  permiso: Mocks;
  auditoria: Mocks;
};
const mockHash = bcrypt.hash as unknown as ReturnType<typeof vi.fn>;

const TODOS = ["VER_PRODUCCION", "INGRESAR_PEDIDO", "GESTIONAR_USUARIOS", "VER_AUDITORIA"];
const ctx = { userId: 1, ip: "10.0.0.1" };

const admin: Gestor = { id: 1, rolId: 1, permisos: new Set(TODOS) };
/** Gestor sin todos los permisos: el caso de escalada. */
const supervisor: Gestor = { id: 5, rolId: 4, permisos: new Set(["VER_PRODUCCION", "GESTIONAR_USUARIOS"]) };

function rol(id: number, nombre: string, permisos: string[], usuarios = 0) {
  return {
    id,
    nombre,
    permisos: permisos.map((codigo) => ({ permiso: { codigo } })),
    _count: { usuarios },
  };
}

const ROL_ADMIN = rol(1, "Administrador", TODOS, 2);
const ROL_LECTOR = rol(3, "Lector", ["VER_PRODUCCION"]);
const ROL_SUPERVISOR = rol(4, "Supervisor", ["VER_PRODUCCION", "GESTIONAR_USUARIOS"], 1);

function usuario(id: number, rolUsuario = ROL_LECTOR, overrides: Record<string, unknown> = {}) {
  return {
    id,
    nombre: `Usuario ${id}`,
    login: `usuario${id}`,
    contacto: null,
    activo: true,
    idRol: rolUsuario.id,
    rol: rolUsuario,
    ...overrides,
  };
}

async function rejection(promise: Promise<unknown>): Promise<AppError> {
  try {
    await promise;
  } catch (error) {
    return error as AppError;
  }
  throw new Error("Expected promise to reject");
}

beforeEach(() => {
  vi.clearAllMocks();
  mockHash.mockResolvedValue("$2b$12$hash-nuevo");
});

describe("listUsuarios", () => {
  it("marca como no gestionables a los usuarios con permisos que el gestor no tiene", async () => {
    db.usuario.findMany.mockResolvedValue([usuario(1, ROL_ADMIN), usuario(2, ROL_LECTOR), usuario(5, ROL_SUPERVISOR)]);
    const result = await listUsuarios(supervisor);
    expect(result.map(({ id, gestionable, esPropio }) => ({ id, gestionable, esPropio }))).toEqual([
      { id: 1, gestionable: false, esPropio: false },
      { id: 2, gestionable: true, esPropio: false },
      { id: 5, gestionable: true, esPropio: true },
    ]);
  });

  it("nunca devuelve el hash ni la token_version", async () => {
    db.usuario.findMany.mockResolvedValue([usuario(2)]);
    await listUsuarios(admin);
    const select = db.usuario.findMany.mock.calls[0]?.[0].select;
    expect(select).not.toHaveProperty("passwordHash");
    expect(select).not.toHaveProperty("tokenVersion");
  });
});

describe("crearUsuario", () => {
  const input = { nombre: "Ana", login: "ana", password: "una frase bastante larga", contacto: null, idRol: 3 };

  it("guarda el hash con costo 12 y audita sin la contraseña", async () => {
    db.rol.findUnique.mockResolvedValue(ROL_LECTOR);
    db.usuario.create.mockResolvedValue(usuario(9, ROL_LECTOR, { nombre: "Ana", login: "ana" }));

    const result = await crearUsuario(input, admin, ctx);

    expect(mockHash).toHaveBeenCalledWith(input.password, 12);
    expect(db.usuario.create.mock.calls[0]?.[0].data).toMatchObject({ passwordHash: "$2b$12$hash-nuevo", idRol: 3 });
    expect(result).toMatchObject({ id: 9, login: "ana", rol: { id: 3, nombre: "Lector" } });
    expect(result).not.toHaveProperty("passwordHash");
    const auditoria = JSON.stringify(db.auditoria.create.mock.calls[0]?.[0]);
    expect(auditoria).toContain('"tablaAfectada":"usuario"');
    expect(auditoria).not.toContain(input.password);
    expect(auditoria).not.toContain("hash");
  });

  it("responde 409 si el login ya existe", async () => {
    db.rol.findUnique.mockResolvedValue(ROL_LECTOR);
    db.usuario.create.mockRejectedValueOnce({ code: "P2002" });
    const error = await rejection(crearUsuario(input, admin, ctx));
    expect(error.statusCode).toBe(409);
    expect(error.message).toContain("login");
  });

  it("responde 400 si el rol no existe", async () => {
    db.rol.findUnique.mockResolvedValue(null);
    expect((await rejection(crearUsuario(input, admin, ctx))).statusCode).toBe(400);
  });

  it("impide que un gestor cree un usuario con un rol superior al suyo", async () => {
    db.rol.findUnique.mockResolvedValue(ROL_ADMIN);
    const error = await rejection(crearUsuario({ ...input, idRol: 1 }, supervisor, ctx));
    expect(error.statusCode).toBe(403);
    expect(db.usuario.create).not.toHaveBeenCalled();
  });
});

describe("editarUsuario", () => {
  it("impide editar a un usuario con permisos que el gestor no tiene", async () => {
    db.usuario.findUnique.mockResolvedValue(usuario(1, ROL_ADMIN));
    expect((await rejection(editarUsuario(1, { nombre: "X" }, supervisor, ctx))).statusCode).toBe(403);
    expect(db.usuario.update).not.toHaveBeenCalled();
  });

  it("impide asignar un rol superior", async () => {
    db.usuario.findUnique.mockResolvedValue(usuario(2, ROL_LECTOR));
    db.rol.findUnique.mockResolvedValue(ROL_ADMIN);
    expect((await rejection(editarUsuario(2, { idRol: 1 }, supervisor, ctx))).statusCode).toBe(403);
  });

  it("impide cambiarse el rol a sí mismo", async () => {
    db.usuario.findUnique.mockResolvedValue(usuario(1, ROL_ADMIN));
    const error = await rejection(editarUsuario(1, { idRol: 3 }, admin, ctx));
    expect(error.statusCode).toBe(403);
    expect(error.message).toContain("propio rol");
  });

  it("permite editar su propio nombre aunque su rol sea superior", async () => {
    db.usuario.findUnique.mockResolvedValue(usuario(5, ROL_SUPERVISOR));
    db.usuario.update.mockResolvedValue(usuario(5, ROL_SUPERVISOR, { nombre: "Nuevo" }));
    await editarUsuario(5, { nombre: "Nuevo" }, supervisor, ctx);
    expect(db.usuario.update.mock.calls[0]?.[0].data).toEqual({ nombre: "Nuevo" });
  });

  it("al cambiar el rol invalida las sesiones y audita antes y después", async () => {
    db.usuario.findUnique.mockResolvedValue(usuario(2, ROL_LECTOR));
    db.rol.findUnique.mockResolvedValue(ROL_SUPERVISOR);
    db.usuario.update.mockResolvedValue(usuario(2, ROL_SUPERVISOR));

    await editarUsuario(2, { idRol: 4 }, admin, ctx);

    expect(db.usuario.update.mock.calls[0]?.[0].data).toEqual({ idRol: 4, tokenVersion: { increment: 1 } });
    expect(db.auditoria.create.mock.calls[0]?.[0].data).toMatchObject({
      accion: "UPDATE",
      datosAnteriores: { idRol: 3 },
      datosNuevos: { idRol: 4 },
    });
  });

  it("no deja sin administradores activos al quitarle el rol al último", async () => {
    db.usuario.findUnique.mockResolvedValue(usuario(2, ROL_ADMIN));
    db.rol.findUnique.mockResolvedValue(ROL_LECTOR);
    db.usuario.count.mockResolvedValue(0);
    expect((await rejection(editarUsuario(2, { idRol: 3 }, admin, ctx))).statusCode).toBe(409);
  });

  it("responde 409 si el login nuevo ya existe", async () => {
    db.usuario.findUnique.mockResolvedValue(usuario(2));
    db.usuario.update.mockRejectedValueOnce({ code: "P2002" });
    expect((await rejection(editarUsuario(2, { login: "otro" }, admin, ctx))).statusCode).toBe(409);
  });
});

describe("restablecerPassword", () => {
  it("aplica la política con el login del usuario", async () => {
    db.usuario.findUnique.mockResolvedValue(usuario(2, ROL_LECTOR, { login: "carolina" }));
    const error = await rejection(restablecerPassword(2, "carolina del galpón", admin, ctx));
    expect(error.message).toContain("login");
    expect(mockHash).not.toHaveBeenCalled();
  });

  it("cambia el hash, invalida sesiones y audita sin el hash", async () => {
    db.usuario.findUnique.mockResolvedValue(usuario(2));
    await restablecerPassword(2, "una frase bastante larga", admin, ctx);
    expect(db.usuario.update.mock.calls[0]?.[0].data).toEqual({
      passwordHash: "$2b$12$hash-nuevo",
      tokenVersion: { increment: 1 },
    });
    expect(db.auditoria.create.mock.calls[0]?.[0].data.datosNuevos).toEqual({ passwordRestablecida: true });
  });

  it("impide cambiar la contraseña de un usuario superior", async () => {
    db.usuario.findUnique.mockResolvedValue(usuario(1, ROL_ADMIN));
    expect((await rejection(restablecerPassword(1, "una frase bastante larga", supervisor, ctx))).statusCode).toBe(403);
  });
});

describe("cambiarEstadoUsuario", () => {
  it("impide desactivarse a sí mismo", async () => {
    expect((await rejection(cambiarEstadoUsuario(1, false, admin, ctx))).statusCode).toBe(403);
  });

  it("desactiva, invalida las sesiones y audita", async () => {
    db.usuario.findUnique.mockResolvedValue(usuario(2));
    db.usuario.update.mockResolvedValue(usuario(2, ROL_LECTOR, { activo: false }));
    const result = await cambiarEstadoUsuario(2, false, admin, ctx);
    expect(result.activo).toBe(false);
    expect(db.usuario.update.mock.calls[0]?.[0].data).toEqual({ activo: false, tokenVersion: { increment: 1 } });
    expect(db.auditoria.create.mock.calls[0]?.[0].data).toMatchObject({ datosAnteriores: { activo: true }, datosNuevos: { activo: false } });
  });

  it("no deja sin administradores activos", async () => {
    db.usuario.findUnique.mockResolvedValue(usuario(2, ROL_ADMIN));
    db.usuario.count.mockResolvedValue(0);
    expect((await rejection(cambiarEstadoUsuario(2, false, admin, ctx))).statusCode).toBe(409);
  });

  it("no escribe nada si el estado no cambia", async () => {
    db.usuario.findUnique.mockResolvedValue(usuario(2));
    await cambiarEstadoUsuario(2, true, admin, ctx);
    expect(db.usuario.update).not.toHaveBeenCalled();
    expect(db.auditoria.create).not.toHaveBeenCalled();
  });
});

describe("roles", () => {
  it("lista con permisos, usuarios y el Administrador protegido", async () => {
    db.rol.findMany.mockResolvedValue([ROL_ADMIN, ROL_LECTOR]);
    const [adminRol, lector] = await listRoles(admin);
    expect(adminRol?.asignable).toBe(true);
    expect(adminRol).toMatchObject({ nombre: "Administrador", protegido: true, gestionable: false, usuarios: 2 });
    const [adminParaSupervisor] = await listRoles(supervisor);
    expect(adminParaSupervisor?.asignable).toBe(false);
    expect(lector).toMatchObject({ nombre: "Lector", protegido: false, gestionable: true, permisos: ["VER_PRODUCCION"] });
  });

  it("crea un rol con sus permisos y lo audita", async () => {
    db.rol.findFirst.mockResolvedValue(null);
    db.permiso.findMany.mockResolvedValue([{ id: 1, codigo: "VER_PRODUCCION" }]);
    db.rol.create.mockResolvedValue({ id: 8 });
    db.rol.findUnique.mockResolvedValue(rol(8, "Bodega", ["VER_PRODUCCION"]));

    const result = await crearRol({ nombre: "Bodega", permisos: ["VER_PRODUCCION"] }, supervisor, ctx);

    expect(db.rol.create.mock.calls[0]?.[0].data).toEqual({ nombre: "Bodega", permisos: { create: [{ idPermiso: 1 }] } });
    expect(result).toMatchObject({ id: 8, permisos: ["VER_PRODUCCION"] });
    expect(db.auditoria.create.mock.calls[0]?.[0].data).toMatchObject({
      tablaAfectada: "rol",
      accion: "INSERT",
      datosNuevos: { nombre: "Bodega", permisos: ["VER_PRODUCCION"] },
    });
  });

  it("impide otorgar permisos que el gestor no tiene", async () => {
    db.rol.findFirst.mockResolvedValue(null);
    db.permiso.findMany.mockResolvedValue([{ id: 4, codigo: "VER_AUDITORIA" }]);
    const error = await rejection(crearRol({ nombre: "Espía", permisos: ["VER_AUDITORIA"] }, supervisor, ctx));
    expect(error.statusCode).toBe(403);
    expect(db.rol.create).not.toHaveBeenCalled();
  });

  it("rechaza permisos que no existen en el catálogo", async () => {
    db.rol.findFirst.mockResolvedValue(null);
    db.permiso.findMany.mockResolvedValue([]);
    const error = await rejection(crearRol({ nombre: "Otro", permisos: ["INVENTADO"] }, admin, ctx));
    expect(error.statusCode).toBe(400);
    expect(error.message).toContain("INVENTADO");
  });

  it("rechaza un nombre repetido sin importar mayúsculas", async () => {
    db.rol.findFirst.mockResolvedValue({ id: 3 });
    expect((await rejection(crearRol({ nombre: "lector", permisos: [] }, admin, ctx))).statusCode).toBe(409);
  });

  it("el rol Administrador no se puede editar ni borrar", async () => {
    db.rol.findUnique.mockResolvedValue(ROL_ADMIN);
    expect((await rejection(editarRol(1, { nombre: "Jefe" }, admin, ctx))).statusCode).toBe(403);
    expect((await rejection(borrarRol(1, admin, ctx))).statusCode).toBe(403);
  });

  it("impide quitarle a su propio rol el permiso de gestionar usuarios", async () => {
    db.rol.findUnique.mockResolvedValue(ROL_SUPERVISOR);
    const error = await rejection(editarRol(4, { permisos: ["VER_PRODUCCION"] }, supervisor, ctx));
    expect(error.statusCode).toBe(409);
    expect(db.rolPermiso.deleteMany).not.toHaveBeenCalled();
  });

  it("reemplaza los permisos y audita los de antes y después", async () => {
    db.rol.findUnique
      .mockResolvedValueOnce(ROL_LECTOR)
      .mockResolvedValueOnce(rol(3, "Lector", ["INGRESAR_PEDIDO", "VER_PRODUCCION"]));
    db.permiso.findMany.mockResolvedValue([{ id: 1, codigo: "VER_PRODUCCION" }, { id: 2, codigo: "INGRESAR_PEDIDO" }]);

    await editarRol(3, { permisos: ["INGRESAR_PEDIDO", "VER_PRODUCCION"] }, admin, ctx);

    expect(db.rolPermiso.deleteMany).toHaveBeenCalledWith({ where: { idRol: 3 } });
    expect(db.rolPermiso.createMany).toHaveBeenCalledWith({ data: [{ idRol: 3, idPermiso: 1 }, { idRol: 3, idPermiso: 2 }] });
    expect(db.auditoria.create.mock.calls[0]?.[0].data).toMatchObject({
      datosAnteriores: { permisos: ["VER_PRODUCCION"] },
      datosNuevos: { permisos: ["INGRESAR_PEDIDO", "VER_PRODUCCION"] },
    });
  });

  it("no borra un rol con usuarios asignados", async () => {
    db.rol.findUnique.mockResolvedValue(rol(3, "Lector", ["VER_PRODUCCION"], 2));
    expect((await rejection(borrarRol(3, admin, ctx))).statusCode).toBe(409);
    expect(db.rol.delete).not.toHaveBeenCalled();
  });

  it("borra un rol sin usuarios y lo audita", async () => {
    db.rol.findUnique.mockResolvedValue(ROL_LECTOR);
    await borrarRol(3, admin, ctx);
    expect(db.rol.delete).toHaveBeenCalledWith({ where: { id: 3 } });
    expect(db.auditoria.create.mock.calls[0]?.[0].data).toMatchObject({ accion: "DELETE", datosAnteriores: { nombre: "Lector" } });
  });
});

describe("editarDescripcionPermiso", () => {
  it("solo cambia la descripción y la audita", async () => {
    db.permiso.findUnique.mockResolvedValue({ id: 1, codigo: "VER_PRODUCCION", descripcion: "Antes" });
    db.permiso.update.mockResolvedValue({ id: 1, codigo: "VER_PRODUCCION", descripcion: "Después" });
    await editarDescripcionPermiso(1, "Después", ctx);
    expect(db.permiso.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { descripcion: "Después" } });
    expect(db.auditoria.create.mock.calls[0]?.[0].data).toMatchObject({ tablaAfectada: "permiso", datosNuevos: { descripcion: "Después" } });
  });

  it("responde 404 si no existe", async () => {
    db.permiso.findUnique.mockResolvedValue(null);
    expect((await rejection(editarDescripcionPermiso(99, "x", ctx))).statusCode).toBe(404);
  });
});
