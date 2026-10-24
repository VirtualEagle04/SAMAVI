import { emitDispositivoEstado } from "../modules/produccion/produccion.events.js"

// Cada ESP32 publica su estado retenido en samavi/dispositivos/<id>/estado: "online" al
// conectar y "offline" como LWT, que el broker publica si se cae. Al suscribirse, el
// broker entrega el último estado de cada dispositivo conocido.
export const TOPICO_ESTADO_DISPOSITIVOS = "samavi/dispositivos/+/estado"

const PATRON_TOPICO_ESTADO = /^samavi\/dispositivos\/([^/]+)\/estado$/

export interface EstadoPublicado {
  estado: "online" | "offline"
  galponId: number | null
  ip: string | null
}

export interface Dispositivo {
  id: string
  galponId: number | null
  ip: string | null
  conectado: boolean
  // Momento en que el backend vio el cambio; null si solo se conoce por el mensaje retenido.
  desde: string | null
}

export interface DeviceStatus {
  brokerConnected: boolean
  connected: boolean
  dispositivos: Dispositivo[]
}

interface RegistroDispositivo extends EstadoPublicado {
  desde: Date | null
}

// Devuelve el id del dispositivo si el tópico es de estado.
export function parseTopicoEstado(topic: string): string | null {
  return PATRON_TOPICO_ESTADO.exec(topic)?.[1] ?? null
}

// Valida el payload {"estado":"online","galponId":1,"ip":"..."}; null si no es válido.
export function parseEstadoPublicado(content: string): EstadoPublicado | null {
  let data: unknown
  try {
    data = JSON.parse(content)
  } catch {
    return null
  }
  if (typeof data !== "object" || data === null) return null

  const { estado, galponId, ip } = data as Record<string, unknown>
  if (estado !== "online" && estado !== "offline") return null

  return {
    estado,
    galponId: typeof galponId === "number" && Number.isInteger(galponId) && galponId > 0 ? galponId : null,
    ip: typeof ip === "string" && ip.length > 0 ? ip : null,
  }
}

export class DeviceStatusTracker {
  private brokerConnected = false
  private readonly dispositivos = new Map<string, RegistroDispositivo>()

  // `onChange` recibe el estado completo cada vez que cambia, para avisar al frontend al instante.
  constructor(private readonly onChange: (status: DeviceStatus) => void = () => {}) {}

  public setBrokerConnected(connected: boolean) {
    this.notificarSiCambia(() => {
      this.brokerConnected = connected
    })
  }

  // `retenido` indica que el broker entregó el último estado guardado, no un cambio en vivo.
  public registrarEstado(id: string, publicado: EstadoPublicado, retenido: boolean) {
    const anterior = this.dispositivos.get(id)
    const mismoEstado = anterior?.estado === publicado.estado
    const desde = mismoEstado ? anterior.desde : retenido ? null : new Date()

    this.notificarSiCambia(() => {
      this.dispositivos.set(id, { ...publicado, desde })
    })

    if (!mismoEstado) {
      const galpon = publicado.galponId === null ? "sin galpón" : `galpón ${publicado.galponId}`
      console.log(`MQTT: Dispositivo ${id} (${galpon}, IP ${publicado.ip ?? "desconocida"}) ${publicado.estado}`)
    }
  }

  // Un mensaje retenido vacío borra el dispositivo del broker; también se olvida aquí.
  public olvidar(id: string) {
    this.notificarSiCambia(() => {
      this.dispositivos.delete(id)
    })
  }

  public getStatus(): DeviceStatus {
    const dispositivos = [...this.dispositivos.entries()].map(([id, registro]) => ({
      id,
      galponId: registro.galponId,
      ip: registro.ip,
      conectado: this.brokerConnected && registro.estado === "online",
      desde: registro.desde ? registro.desde.toISOString() : null,
    }))

    return {
      brokerConnected: this.brokerConnected,
      connected: dispositivos.some((dispositivo) => dispositivo.conectado),
      dispositivos,
    }
  }

  private notificarSiCambia(cambio: () => void) {
    const antes = JSON.stringify(this.getStatus())
    cambio()
    const status = this.getStatus()
    if (JSON.stringify(status) !== antes) {
      this.onChange(status)
    }
  }
}

export const deviceTracker = new DeviceStatusTracker(emitDispositivoEstado)
