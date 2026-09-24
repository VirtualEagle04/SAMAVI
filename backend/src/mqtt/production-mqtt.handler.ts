import { parseProductionCountInput } from "../modules/produccion/produccion.schemas.js";
import { registerCount } from "../modules/produccion/produccion.service.js";
import { deviceTracker } from "./device-status.js";

export async function handleProductionMessage(topic: string, message: Buffer): Promise<void> {
  const content = message.toString();

  // 1. Handle Mosquitto Broker Sys Topics
  if (topic.startsWith("$SYS/broker/clients/connected")) {
    const clients = parseInt(content, 10);
    if (!isNaN(clients)) {
      deviceTracker.setConnectedClients(clients);
    }
    return;
  }

  // 2. Handle ESP32 LWT Status
  if (topic === "samavi/esp32/status" || topic === "samavi/status") {
    const statusText = content.trim().toLowerCase();
    if (statusText === "online" || statusText === "offline") {
      deviceTracker.setExplicitStatus(statusText as "online" | "offline");
    }
    return;
  }

  // 3. Handle ESP32 Heartbeat
  if (topic === "samavi/esp32/heartbeat" || topic === "samavi/ping") {
    deviceTracker.recordActivity();
    return;
  }

  // 4. Handle Production Count Messages
  try {
    const data: unknown = JSON.parse(content);
    deviceTracker.recordActivity();
    await registerCount(parseProductionCountInput(data));
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "Error desconocido";
    console.error("MQTT: No se pudo registrar el conteo:", messageText);
  }
}