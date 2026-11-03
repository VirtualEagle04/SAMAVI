import type { Request, Response } from "express";
import { auditContext } from "../../shared/audit/auditoria.js";
import { AppError } from "../../shared/errors/app-error.js";
import {
  borrarRol,
  cambiarEstadoUsuario,
  crearRol,
  crearUsuario,
  editarDescripcionPermiso,
  editarRol,
  editarUsuario,
  getUsuario,
  type Gestor,
  listPermisos,
  listRoles,
  listUsuarios,
  restablecerPassword,
} from "./usuarios.service.js";
import {
  parseCrearUsuarioInput,
  parseDescripcionPermisoInput,
  parseEditarRolInput,
  parseEditarUsuarioInput,
  parseEstadoInput,
  parseId,
  parseRestablecerPasswordInput,
  parseRolInput,
} from "./usuarios.schemas.js";

function gestor(request: Request): Gestor {
  if (!request.auth) {
    throw new AppError(401, "Token requerido");
  }
  return { id: request.auth.id, rolId: request.auth.rolId, permisos: request.auth.permisos };
}

export async function listUsuariosController(request: Request, response: Response): Promise<void> {
  response.json(await listUsuarios(gestor(request)));
}

export async function getUsuarioController(request: Request, response: Response): Promise<void> {
  response.json(await getUsuario(parseId(request.params.id, "id"), gestor(request)));
}

export async function crearUsuarioController(request: Request, response: Response): Promise<void> {
  response.status(201).json(await crearUsuario(parseCrearUsuarioInput(request.body), gestor(request), auditContext(request)));
}

export async function editarUsuarioController(request: Request, response: Response): Promise<void> {
  response.json(await editarUsuario(
    parseId(request.params.id, "id"),
    parseEditarUsuarioInput(request.body),
    gestor(request),
    auditContext(request),
  ));
}

export async function restablecerPasswordController(request: Request, response: Response): Promise<void> {
  const { password } = parseRestablecerPasswordInput(request.body);
  await restablecerPassword(parseId(request.params.id, "id"), password, gestor(request), auditContext(request));
  response.status(204).end();
}

export async function cambiarEstadoUsuarioController(request: Request, response: Response): Promise<void> {
  const { activo } = parseEstadoInput(request.body);
  response.json(await cambiarEstadoUsuario(parseId(request.params.id, "id"), activo, gestor(request), auditContext(request)));
}

export async function listRolesController(request: Request, response: Response): Promise<void> {
  response.json(await listRoles(gestor(request)));
}

export async function crearRolController(request: Request, response: Response): Promise<void> {
  response.status(201).json(await crearRol(parseRolInput(request.body), gestor(request), auditContext(request)));
}

export async function editarRolController(request: Request, response: Response): Promise<void> {
  response.json(await editarRol(
    parseId(request.params.id, "id"),
    parseEditarRolInput(request.body),
    gestor(request),
    auditContext(request),
  ));
}

export async function borrarRolController(request: Request, response: Response): Promise<void> {
  await borrarRol(parseId(request.params.id, "id"), gestor(request), auditContext(request));
  response.status(204).end();
}

export async function listPermisosController(_request: Request, response: Response): Promise<void> {
  response.json(await listPermisos());
}

export async function editarPermisoController(request: Request, response: Response): Promise<void> {
  const { descripcion } = parseDescripcionPermisoInput(request.body);
  response.json(await editarDescripcionPermiso(parseId(request.params.id, "id"), descripcion, auditContext(request)));
}
