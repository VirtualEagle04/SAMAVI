import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "../../database/prisma.js";
import { type AuditContext, registrarAuditoria } from "../../shared/audit/auditoria.js";
import { AppError } from "../../shared/errors/app-error.js";
import { BCRYPT_COSTO, parsePassword } from "../../shared/security/password-policy.js";
import { PERMISO_GESTIONAR_USUARIOS, ROL_ADMINISTRADOR } from "../../shared/security/roles.js";
import type {
  ContactoInput,
  CrearUsuarioInput,
  EditarRolInput,
  EditarUsuarioInput,
  RolInput,
} from "./usuarios.schemas.js";

/**
 * Quién gestiona: su id y sus permisos actuales. Nadie puede otorgar, ni
 * gestionar a quien tenga, permisos que el gestor no tiene; así nadie
 * escala privilegios con GESTIONAR_USUARIOS.
 */
export type Gestor = {
  id: number;
  rolId: number;
  permisos: ReadonlySet<string>;
};

type Tx = Prisma.TransactionClient;

const permisosDelRol = { permisos: { select: { permiso: { select: { codigo: true } } } } } as const;

const usuarioSelect = {
  id: true,
  nombre: true,
  login: true,
  contacto: true,
  activo: true,
  idRol: true,
  rol: { select: { id: true, nombre: true, ...permisosDelRol } },
} as const;

type UsuarioRow = Prisma.UsuarioGetPayload<{ select: typeof usuarioSelect }>;

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

function codigos(rol: { permisos: { permiso: { codigo: string } }[] }): string[] {
  return rol.permisos.map(({ permiso }) => permiso.codigo).sort();
}

function cubre(gestor: Gestor, permisos: readonly string[]): boolean {
  return permisos.every((codigo) => gestor.permisos.has(codigo));
}

function esProtegido(nombreRol: string): boolean {
  return nombreRol === ROL_ADMINISTRADOR;
}

function contactoJson(contacto: ContactoInput | null): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return contacto === null ? Prisma.DbNull : contacto;
}

function snapshotUsuario(usuario: {
  nombre: string;
  login: string;
  contacto: Prisma.JsonValue;
  idRol: number;
  activo: boolean;
}): Prisma.InputJsonObject {
  return {
    nombre: usuario.nombre,
    login: usuario.login,
    contacto: (usuario.contacto ?? null) as Prisma.InputJsonValue | null,
    idRol: usuario.idRol,
    activo: usuario.activo,
  };
}

function presentarUsuario(usuario: UsuarioRow, gestor: Gestor) {
  const esPropio = usuario.id === gestor.id;
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    login: usuario.login,
    contacto: usuario.contacto,
    activo: usuario.activo,
    rol: { id: usuario.rol.id, nombre: usuario.rol.nombre },
    esPropio,
    /** Puede cambiarle rol, estado y contraseña (sobre sí mismo solo la contraseña). */
    gestionable: esPropio || cubre(gestor, codigos(usuario.rol)),
  };
}

async function findUsuarioOrFail(tx: Tx, id: number): Promise<UsuarioRow> {
  const usuario = await tx.usuario.findUnique({ where: { id }, select: usuarioSelect });
  if (!usuario) {
    throw new AppError(404, "Usuario no encontrado");
  }
  return usuario;
}

function assertGestionable(usuario: UsuarioRow, gestor: Gestor): void {
  if (!cubre(gestor, codigos(usuario.rol))) {
    throw new AppError(403, "No puedes gestionar a un usuario con permisos que tú no tienes");
  }
}

async function findRolAsignable(tx: Tx, idRol: number, gestor: Gestor) {
  const rol = await tx.rol.findUnique({ where: { id: idRol }, include: permisosDelRol });
  if (!rol) {
    throw new AppError(400, "El rol indicado no existe");
  }
  if (!cubre(gestor, codigos(rol))) {
    throw new AppError(403, "No puedes asignar un rol con permisos que tú no tienes");
  }
  return rol;
}

/** Siempre debe quedar un Administrador activo además del usuario que se modifica. */
async function assertOtroAdministradorActivo(tx: Tx, idUsuario: number): Promise<void> {
  const otros = await tx.usuario.count({
    where: { id: { not: idUsuario }, activo: true, rol: { nombre: ROL_ADMINISTRADOR } },
  });
  if (otros === 0) {
    throw new AppError(409, "Debe quedar al menos un administrador activo");
  }
}

// ---------------------------------------------------------------- Usuarios

export async function listUsuarios(gestor: Gestor) {
  const usuarios = await prisma.usuario.findMany({ select: usuarioSelect, orderBy: { nombre: "asc" } });
  return usuarios.map((usuario) => presentarUsuario(usuario, gestor));
}

export async function getUsuario(id: number, gestor: Gestor) {
  return presentarUsuario(await findUsuarioOrFail(prisma, id), gestor);
}

export async function crearUsuario(input: CrearUsuarioInput, gestor: Gestor, context: AuditContext) {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COSTO);
  try {
    return await prisma.$transaction(async (tx) => {
      await findRolAsignable(tx, input.idRol, gestor);
      const creado = await tx.usuario.create({
        data: {
          nombre: input.nombre,
          login: input.login,
          passwordHash,
          contacto: contactoJson(input.contacto),
          idRol: input.idRol,
        },
        select: usuarioSelect,
      });
      await registrarAuditoria(tx, context, {
        tabla: "usuario",
        idRegistro: creado.id,
        accion: "INSERT",
        despues: snapshotUsuario(creado),
      });
      return presentarUsuario(creado, gestor);
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError(409, "El login ya está en uso");
    }
    throw error;
  }
}

export async function editarUsuario(id: number, input: EditarUsuarioInput, gestor: Gestor, context: AuditContext) {
  try {
    return await prisma.$transaction(async (tx) => {
      const anterior = await findUsuarioOrFail(tx, id);
      const esPropio = id === gestor.id;
      if (!esPropio) {
        assertGestionable(anterior, gestor);
      }

      const cambiaRol = input.idRol !== undefined && input.idRol !== anterior.idRol;
      if (cambiaRol && input.idRol !== undefined) {
        if (esPropio) {
          throw new AppError(403, "No puedes cambiar tu propio rol");
        }
        const nuevoRol = await findRolAsignable(tx, input.idRol, gestor);
        if (anterior.activo && esProtegido(anterior.rol.nombre) && !esProtegido(nuevoRol.nombre)) {
          await assertOtroAdministradorActivo(tx, id);
        }
      }

      const actualizado = await tx.usuario.update({
        where: { id },
        data: {
          ...(input.nombre === undefined ? {} : { nombre: input.nombre }),
          ...(input.login === undefined ? {} : { login: input.login }),
          ...(input.contacto === undefined ? {} : { contacto: contactoJson(input.contacto) }),
          ...(cambiaRol && input.idRol !== undefined
            ? { idRol: input.idRol, tokenVersion: { increment: 1 } }
            : {}),
        },
        select: usuarioSelect,
      });
      await registrarAuditoria(tx, context, {
        tabla: "usuario",
        idRegistro: id,
        accion: "UPDATE",
        antes: snapshotUsuario(anterior),
        despues: snapshotUsuario(actualizado),
      });
      return presentarUsuario(actualizado, gestor);
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError(409, "El login ya está en uso");
    }
    throw error;
  }
}

/** Asigna una contraseña nueva y cierra todas las sesiones del usuario. */
export async function restablecerPassword(id: number, password: string, gestor: Gestor, context: AuditContext) {
  const usuario = await findUsuarioOrFail(prisma, id);
  if (id !== gestor.id) {
    assertGestionable(usuario, gestor);
  }
  const passwordHash = await bcrypt.hash(parsePassword(password, usuario.login), BCRYPT_COSTO);

  await prisma.$transaction(async (tx) => {
    await tx.usuario.update({
      where: { id },
      data: { passwordHash, tokenVersion: { increment: 1 } },
    });
    await registrarAuditoria(tx, context, {
      tabla: "usuario",
      idRegistro: id,
      accion: "UPDATE",
      despues: { passwordRestablecida: true },
    });
  });
}

export async function cambiarEstadoUsuario(id: number, activo: boolean, gestor: Gestor, context: AuditContext) {
  if (id === gestor.id) {
    throw new AppError(403, "No puedes cambiar el estado de tu propia cuenta");
  }
  return prisma.$transaction(async (tx) => {
    const anterior = await findUsuarioOrFail(tx, id);
    assertGestionable(anterior, gestor);
    if (anterior.activo === activo) {
      return presentarUsuario(anterior, gestor);
    }
    if (!activo && esProtegido(anterior.rol.nombre)) {
      await assertOtroAdministradorActivo(tx, id);
    }

    const actualizado = await tx.usuario.update({
      where: { id },
      // Desactivar cierra las sesiones abiertas en la siguiente solicitud.
      data: { activo, ...(activo ? {} : { tokenVersion: { increment: 1 } }) },
      select: usuarioSelect,
    });
    await registrarAuditoria(tx, context, {
      tabla: "usuario",
      idRegistro: id,
      accion: "UPDATE",
      antes: { activo: anterior.activo },
      despues: { activo },
    });
    return presentarUsuario(actualizado, gestor);
  });
}

// ------------------------------------------------------------------- Roles

type RolRow = Prisma.RolGetPayload<{ include: typeof permisosDelRol & { _count: { select: { usuarios: true } } } }>;

function presentarRol(rol: RolRow, gestor: Gestor) {
  const permisos = codigos(rol);
  const protegido = esProtegido(rol.nombre);
  return {
    id: rol.id,
    nombre: rol.nombre,
    permisos,
    usuarios: rol._count.usuarios,
    protegido,
    /** Puede editarlo o borrarlo. */
    gestionable: !protegido && cubre(gestor, permisos),
    /** Puede asignárselo a un usuario. */
    asignable: cubre(gestor, permisos),
  };
}

const rolInclude = { ...permisosDelRol, _count: { select: { usuarios: true } } } as const;

async function findRolOrFail(tx: Tx, id: number): Promise<RolRow> {
  const rol = await tx.rol.findUnique({ where: { id }, include: rolInclude });
  if (!rol) {
    throw new AppError(404, "Rol no encontrado");
  }
  return rol;
}

function assertRolGestionable(rol: RolRow, gestor: Gestor): void {
  if (esProtegido(rol.nombre)) {
    throw new AppError(403, `El rol ${ROL_ADMINISTRADOR} está protegido y no se puede modificar`);
  }
  if (!cubre(gestor, codigos(rol))) {
    throw new AppError(403, "No puedes gestionar un rol con permisos que tú no tienes");
  }
}

/** Valida que los códigos existan y que el gestor los tenga; devuelve sus ids. */
async function resolverPermisos(tx: Tx, permisos: string[], gestor: Gestor): Promise<number[]> {
  const encontrados = await tx.permiso.findMany({ where: { codigo: { in: permisos } }, select: { id: true, codigo: true } });
  const conocidos = new Set(encontrados.map((permiso) => permiso.codigo));
  const desconocidos = permisos.filter((codigo) => !conocidos.has(codigo));
  if (desconocidos.length > 0) {
    throw new AppError(400, `Permisos desconocidos: ${desconocidos.join(", ")}`);
  }
  const ajenos = permisos.filter((codigo) => !gestor.permisos.has(codigo));
  if (ajenos.length > 0) {
    throw new AppError(403, `No puedes otorgar permisos que tú no tienes: ${ajenos.join(", ")}`);
  }
  return encontrados.map((permiso) => permiso.id);
}

/** Los nombres de rol no se repiten aunque cambien mayúsculas o minúsculas. */
async function assertNombreRolLibre(tx: Tx, nombre: string, excluirId?: number): Promise<void> {
  const existente = await tx.rol.findFirst({
    where: {
      nombre: { equals: nombre, mode: "insensitive" },
      ...(excluirId === undefined ? {} : { id: { not: excluirId } }),
    },
    select: { id: true },
  });
  if (existente) {
    throw new AppError(409, "Ya existe un rol con ese nombre");
  }
}

export async function listRoles(gestor: Gestor) {
  const roles = await prisma.rol.findMany({ include: rolInclude, orderBy: { id: "asc" } });
  return roles.map((rol) => presentarRol(rol, gestor));
}

export async function crearRol(input: RolInput, gestor: Gestor, context: AuditContext) {
  try {
    return await prisma.$transaction(async (tx) => {
      await assertNombreRolLibre(tx, input.nombre);
      const idsPermisos = await resolverPermisos(tx, input.permisos, gestor);
      const creado = await tx.rol.create({
        data: {
          nombre: input.nombre,
          permisos: { create: idsPermisos.map((idPermiso) => ({ idPermiso })) },
        },
      });
      await registrarAuditoria(tx, context, {
        tabla: "rol",
        idRegistro: creado.id,
        accion: "INSERT",
        despues: { nombre: input.nombre, permisos: input.permisos },
      });
      return presentarRol(await findRolOrFail(tx, creado.id), gestor);
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError(409, "Ya existe un rol con ese nombre");
    }
    throw error;
  }
}

export async function editarRol(id: number, input: EditarRolInput, gestor: Gestor, context: AuditContext) {
  try {
    return await prisma.$transaction(async (tx) => {
      const anterior = await findRolOrFail(tx, id);
      assertRolGestionable(anterior, gestor);
      const permisosAntes = codigos(anterior);

      if (input.nombre !== undefined && input.nombre !== anterior.nombre) {
        await assertNombreRolLibre(tx, input.nombre, id);
      }
      if (input.permisos !== undefined) {
        if (id === gestor.rolId && !input.permisos.includes(PERMISO_GESTIONAR_USUARIOS)) {
          throw new AppError(409, `No puedes quitarle a tu propio rol el permiso ${PERMISO_GESTIONAR_USUARIOS}`);
        }
        const idsPermisos = await resolverPermisos(tx, input.permisos, gestor);
        await tx.rolPermiso.deleteMany({ where: { idRol: id } });
        await tx.rolPermiso.createMany({ data: idsPermisos.map((idPermiso) => ({ idRol: id, idPermiso })) });
      }
      if (input.nombre !== undefined) {
        await tx.rol.update({ where: { id }, data: { nombre: input.nombre } });
      }

      const actualizado = await findRolOrFail(tx, id);
      await registrarAuditoria(tx, context, {
        tabla: "rol",
        idRegistro: id,
        accion: "UPDATE",
        antes: { nombre: anterior.nombre, permisos: permisosAntes },
        despues: { nombre: actualizado.nombre, permisos: codigos(actualizado) },
      });
      return presentarRol(actualizado, gestor);
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError(409, "Ya existe un rol con ese nombre");
    }
    throw error;
  }
}

export async function borrarRol(id: number, gestor: Gestor, context: AuditContext): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const rol = await findRolOrFail(tx, id);
    assertRolGestionable(rol, gestor);
    if (rol._count.usuarios > 0) {
      throw new AppError(409, "No se puede borrar un rol con usuarios asignados; reasígnalos primero");
    }
    // rol_permiso se borra en cascada.
    await tx.rol.delete({ where: { id } });
    await registrarAuditoria(tx, context, {
      tabla: "rol",
      idRegistro: id,
      accion: "DELETE",
      antes: { nombre: rol.nombre, permisos: codigos(rol) },
    });
  });
}

// ---------------------------------------------------------------- Permisos

export async function listPermisos() {
  const permisos = await prisma.permiso.findMany({
    include: { roles: { select: { rol: { select: { id: true, nombre: true } } } } },
    orderBy: { codigo: "asc" },
  });
  return permisos.map((permiso) => ({
    id: permiso.id,
    codigo: permiso.codigo,
    descripcion: permiso.descripcion,
    roles: permiso.roles.map(({ rol }) => rol),
  }));
}

/** El catálogo lo define el código: desde la interfaz solo cambia la descripción. */
export async function editarDescripcionPermiso(id: number, descripcion: string, context: AuditContext) {
  return prisma.$transaction(async (tx) => {
    const anterior = await tx.permiso.findUnique({ where: { id } });
    if (!anterior) {
      throw new AppError(404, "Permiso no encontrado");
    }
    const actualizado = await tx.permiso.update({ where: { id }, data: { descripcion } });
    await registrarAuditoria(tx, context, {
      tabla: "permiso",
      idRegistro: id,
      accion: "UPDATE",
      antes: { codigo: anterior.codigo, descripcion: anterior.descripcion },
      despues: { codigo: actualizado.codigo, descripcion: actualizado.descripcion },
    });
    return { id: actualizado.id, codigo: actualizado.codigo, descripcion: actualizado.descripcion };
  });
}
