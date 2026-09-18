export type Role = "Administrador" | "Galponero" | "Vendedor"

export interface AuthResponse {
  user: string
  role: Role
}

// TODO: conectar a POST /auth/login cuando el backend esté listo
const MOCK_USERS: Record<string, { password: string; role: Role }> = {
  admin: { password: "admin1234", role: "Administrador" },
  galponero: { password: "galpon1234", role: "Galponero" },
  vendedor: { password: "venta1234", role: "Vendedor" },
}

export async function login(
  username: string,
  password: string
): Promise<AuthResponse> {
  await new Promise((r) => setTimeout(r, 600))

  const found = MOCK_USERS[username.toLowerCase()]
  if (!found || found.password !== password) {
    throw new Error("Usuario o contraseña incorrectos")
  }

  return { user: username, role: found.role }
}
