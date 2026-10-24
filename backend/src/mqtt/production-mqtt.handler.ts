import { parseProductionCountInput } from "../modules/produccion/produccion.schemas.js";
import { registerCount } from "../modules/produccion/produccion.service.js";
import { deviceTracker, parseEstadoPublicado, parseTopicoEstado } from "./device-status.js";

export async function handleProductionMessage(topic: string, message: Buffer, retained: boolean): Promise<void> {
  const content = message.toString();

  // 1. Estado de un dispositivo: samavi/dispositivos/<id>/estado
  const dispositivoId = parseTopicoEstado(topic);
  if (dispositivoId !== null) {
    if (content.length === 0) {
      deviceTracker.olvidar(dispositivoId);
      return;
    }
    const estado = parseEstadoPublicado(content);
    if (estado === null) {
      console.error(`MQTT: Estado inválido del dispositivo ${dispositivoId}:`, content);
      return;
    }
    deviceTracker.registrarEstado(dispositivoId, estado, retained);
    return;
  }

  // 2. Conteos de producción
  try {
    const data: unknown = JSON.parse(content);
    await registerCount(parseProductionCountInput(data));
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "Error desconocido";
    console.error("MQTT: No se pudo registrar el conteo:", messageText);
  }
}
