export interface Contacto {
  telefono?: string
  correo?: string
}

export interface Usuario {
  id: number
  nombre: string
  login: string
  contacto: Record<string, unknown> | null
  activo: boolean
  rol: { id: number; nombre: string }
  /** Es la cuenta de la sesión actual. */
  esPropio: boolean
  /** El backend permite cambiarle rol, estado y contraseña (calculado con los permisos del gestor). */
  gestionable: boolean
}

export interface Rol {
  id: number
  nombre: string
  permisos: string[]
  usuarios: number
  /** Rol Administrador: no se renombra, borra ni cambia de permisos. */
  protegido: boolean
  /** Puede editarlo o borrarlo. */
  gestionable: boolean
  /** Puede asignárselo a un usuario (sus permisos están dentro de los del gestor). */
  asignable: boolean
}

export interface Permiso {
  id: number
  codigo: string
  descripcion: string
  roles: { id: number; nombre: string }[]
}

export interface CrearUsuarioPayload {
  nombre: string
  login: string
  password: string
  contacto: Contacto | null
  idRol: number
}

export type EditarUsuarioPayload = Partial<Omit<CrearUsuarioPayload, "password">>

export interface RolPayload {
  nombre: string
  permisos: string[]
}
