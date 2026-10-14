export type Role = "Administrador" | "Galponero" | "Vendedor"

interface LoginApiResponse {
  token: string
  user: {
    login: string
    rol: string
    permisos: string[]
  }
  permissions: string[]
}

export interface AuthResponse {
  token: string
  user: string
  role: Role
  permissions: string[]
}

const API_URL = import.meta.env.VITE_API_URL ?? ""

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

  return {
    token: body.token,
    user: body.user.login,
    role: body.user.rol as Role,
    permissions: body.permissions ?? body.user.permisos,
  }
}
