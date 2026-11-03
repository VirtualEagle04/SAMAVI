import { AppError } from "../../shared/errors/app-error.js";
import { parsePassword } from "../../shared/security/password-policy.js";

export type ContactoInput = {
  telefono?: string;
  correo?: string;
};

export type CrearUsuarioInput = {
  nombre: string;
  login: string;
  password: string;
  contacto: ContactoInput | null;
  idRol: number;
};

export type EditarUsuarioInput = {
  nombre?: string;
  login?: string;
  /** null borra el contacto. */
  contacto?: ContactoInput | null;
  idRol?: number;
};

export type RolInput = {
  nombre: string;
  permisos: string[];
};

export type EditarRolInput = {
  nombre?: string;
  permisos?: string[];
};

const LOGIN_PATRON = /^[a-z0-9._-]{3,50}$/;
const TELEFONO_PATRON = /^\+?[0-9 ()-]{7,20}$/;
// Validación sintáctica básica; no confirma que el buzón exista.
const CORREO_PATRON = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODIGO_PERMISO_PATRON = /^[A-Z_]{1,50}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function body(value: unknown, descripcion: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new AppError(400, `El cuerpo de ${descripcion} es inválido`);
  }
  return value;
}

function texto(value: unknown, campo: string, min: number, max: number): string {
  if (typeof value !== "string") {
    throw new AppError(400, `${campo} es obligatorio`);
  }
  const limpio = value.trim().replace(/\s+/g, " ");
  if (limpio.length < min) {
    throw new AppError(400, min <= 1 ? `${campo} es obligatorio` : `${campo} debe tener al menos ${min} caracteres`);
  }
  if (limpio.length > max) {
    throw new AppError(400, `${campo} no puede superar ${max} caracteres`);
  }
  return limpio;
}

function positiveInteger(value: unknown, campo: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new AppError(400, `${campo} debe ser un entero positivo`);
  }
  return value;
}

export function parseId(value: unknown, campo: string): number {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new AppError(400, `${campo} debe ser un entero positivo`);
  }
  return positiveInteger(Number(value), campo);
}

export function parseLogin(value: unknown): string {
  if (typeof value !== "string") {
    throw new AppError(400, "login es obligatorio");
  }
  const login = value.trim().toLowerCase();
  if (!LOGIN_PATRON.test(login)) {
    throw new AppError(400, "login debe tener de 3 a 50 caracteres: letras sin tilde, números, punto, guion o guion bajo");
  }
  return login;
}

function parseNombre(value: unknown): string {
  return texto(value, "nombre", 1, 100);
}

export function parseContacto(value: unknown): ContactoInput | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (!isRecord(value)) {
    throw new AppError(400, "contacto debe ser un objeto");
  }
  const contacto: ContactoInput = {};
  if (value.telefono !== undefined && value.telefono !== null && value.telefono !== "") {
    if (typeof value.telefono !== "string" || !TELEFONO_PATRON.test(value.telefono.trim())) {
      throw new AppError(400, "telefono debe tener de 7 a 20 dígitos y puede incluir +, espacios, guiones o paréntesis");
    }
    contacto.telefono = value.telefono.trim();
  }
  if (value.correo !== undefined && value.correo !== null && value.correo !== "") {
    if (typeof value.correo !== "string") {
      throw new AppError(400, "correo debe ser texto");
    }
    const correo = value.correo.trim().toLowerCase();
    if (correo.length > 254 || !CORREO_PATRON.test(correo)) {
      throw new AppError(400, "correo no es una dirección válida");
    }
    contacto.correo = correo;
  }
  return Object.keys(contacto).length === 0 ? null : contacto;
}

function parsePermisos(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new AppError(400, "permisos debe ser una lista de códigos");
  }
  const codigos = new Set<string>();
  for (const codigo of value) {
    if (typeof codigo !== "string" || !CODIGO_PERMISO_PATRON.test(codigo)) {
      throw new AppError(400, "Cada permiso debe ser un código en mayúsculas, por ejemplo VER_PRODUCCION");
    }
    codigos.add(codigo);
  }
  return [...codigos].sort();
}

function parseNombreRol(value: unknown): string {
  return texto(value, "El nombre del rol", 2, 50);
}

export function parseCrearUsuarioInput(value: unknown): CrearUsuarioInput {
  const input = body(value, "la creación del usuario");
  const login = parseLogin(input.login);
  return {
    nombre: parseNombre(input.nombre),
    login,
    password: parsePassword(input.password, login),
    contacto: parseContacto(input.contacto),
    idRol: positiveInteger(input.idRol, "idRol"),
  };
}

export function parseEditarUsuarioInput(value: unknown): EditarUsuarioInput {
  const input = body(value, "la edición del usuario");
  const resultado: EditarUsuarioInput = {};
  if (input.nombre !== undefined) resultado.nombre = parseNombre(input.nombre);
  if (input.login !== undefined) resultado.login = parseLogin(input.login);
  if (input.contacto !== undefined) resultado.contacto = parseContacto(input.contacto);
  if (input.idRol !== undefined) resultado.idRol = positiveInteger(input.idRol, "idRol");
  if (Object.keys(resultado).length === 0) {
    throw new AppError(400, "No hay cambios para guardar");
  }
  return resultado;
}

/** Solo comprueba el tipo: la política se aplica en el servicio, que conoce el login. */
export function parseRestablecerPasswordInput(value: unknown): { password: string } {
  const input = body(value, "el cambio de contraseña");
  if (typeof input.password !== "string" || input.password === "") {
    throw new AppError(400, "La contraseña es obligatoria");
  }
  return { password: input.password };
}

export function parseEstadoInput(value: unknown): { activo: boolean } {
  const input = body(value, "el cambio de estado");
  if (typeof input.activo !== "boolean") {
    throw new AppError(400, "activo debe ser verdadero o falso");
  }
  return { activo: input.activo };
}

export function parseRolInput(value: unknown): RolInput {
  const input = body(value, "el rol");
  return { nombre: parseNombreRol(input.nombre), permisos: parsePermisos(input.permisos) };
}

export function parseEditarRolInput(value: unknown): EditarRolInput {
  const input = body(value, "el rol");
  const resultado: EditarRolInput = {};
  if (input.nombre !== undefined) resultado.nombre = parseNombreRol(input.nombre);
  if (input.permisos !== undefined) resultado.permisos = parsePermisos(input.permisos);
  if (Object.keys(resultado).length === 0) {
    throw new AppError(400, "No hay cambios para guardar");
  }
  return resultado;
}

export function parseDescripcionPermisoInput(value: unknown): { descripcion: string } {
  const input = body(value, "el permiso");
  return { descripcion: texto(input.descripcion, "La descripción", 1, 150) };
}
