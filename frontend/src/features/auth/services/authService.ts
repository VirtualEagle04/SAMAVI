/** Nombre del rol. Los roles se crean desde el módulo de usuarios, así que no es una lista fija. */
export type Role = string

/** El único rol que el sistema reconoce por nombre: está protegido y tiene todos los permisos. */
export const ROL_ADMINISTRADOR = "Administrador"

interface SessionApiResponse {
  user: {
    login: string
    rol: string
    permisos: string[]
  }
  permissions: string[]
}

interface LoginApiResponse extends SessionApiResponse {
  token: string
}

export interface SessionData {
  user: string
  role: Role
  permissions: string[]
}

export interface AuthResponse extends SessionData {
  token: string
}

/** La sesión fue revocada o expiró: hay que volver a iniciar sesión. */
export class SessionExpiredError extends Error {
  constructor(message = "Tu sesión terminó; inicia sesión de nuevo") {
    super(message)
    this.name = "SessionExpiredError"
  }
}

const API_URL = import.meta.env.VITE_API_URL ?? ""

function toSession(body: SessionApiResponse): SessionData {
  return {
    user: body.user.login,
    role: body.user.rol,
    permissions: body.permissions ?? body.user.permisos,
  }
}

export async function login(
  username: string,
  password: string
): Promise<AuthResponse> {
  let response: Response

  try {
    response = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: username, password }),
    })
  } catch {
    throw new Error("No se pudo conectar con el servidor")
  }

  const body = (await response.json().catch(() => null)) as
    | LoginApiResponse
    | { error?: string }
    | null

  if (!response.ok) {
    throw new Error(
      body && "error" in body && body.error
        ? body.error
        : "Usuario o contraseña incorrectos"
    )
  }

  if (!body || !("token" in body) || !("user" in body)) {
    throw new Error("La respuesta del servidor no es válida")
  }

  return { token: body.token, ...toSession(body) }
}

/** Rol y permisos actuales del usuario, para no depender de lo guardado al iniciar sesión. */
export async function fetchSession(token: string): Promise<SessionData> {
  const response = await fetch(`${API_URL}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (response.status === 401) {
    throw new SessionExpiredError()
  }
  const body = (await response.json().catch(() => null)) as SessionApiResponse | null
  if (!response.ok || !body || !("user" in body)) {
    throw new Error("No se pudo actualizar la sesión")
  }
  return toSession(body)
}
