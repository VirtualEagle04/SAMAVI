import { parseProductionCountInput } from "../modules/produccion/produccion.schemas.js";
import { registerCount } from "../modules/produccion/produccion.service.js";

export async function handleProductionMessage(message: Buffer): Promise<void> {
  try {
    const data: unknown = JSON.parse(message.toString());
    await registerCount(parseProductionCountInput(data));
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "Error desconocido";
    console.error("MQTT: No se pudo registrar el conteo:", messageText);
  }
}