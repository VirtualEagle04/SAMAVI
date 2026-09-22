export interface ProductionCount {
  id: string
  timestamp: string
  cantidad: number
  idGalpon: number
  codigoCategoriaPeso: string
  galpon: { nombre: string }
  categoriaPeso: { nombre: string }
}

const API_URL = import.meta.env.VITE_API_URL ?? ""

export async function listProductionCounts(token: string): Promise<ProductionCount[]> {
  const response = await fetch(`${API_URL}/api/v1/produccion/conteos`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    throw new Error("No se pudo cargar el monitoreo de producción")
  }

  return (await response.json()) as ProductionCount[]
}