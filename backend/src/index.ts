import express from "express";
import mqtt, { type MqttClient } from "mqtt";
import { env } from "./config/env.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { produccionRoutes } from "./modules/produccion/produccion.routes.js";
import { comercialRoutes } from "./modules/comercial/comercial.routes.js";
import { inventarioRoutes } from "./modules/inventario/inventario.routes.js";
import { galponesRoutes } from "./modules/galpones/galpones.routes.js";
import { dashboardRoutes } from "./modules/dashboard/dashboard.routes.js";
import { consolidacionRoutes } from "./modules/consolidacion/consolidacion.routes.js";
import { auditoriaRoutes } from "./modules/auditoria/auditoria.routes.js";
import { prisma } from "./database/prisma.js";
import { handleProductionMessage } from "./mqtt/production-mqtt.handler.js";
import { deviceTracker, TOPICO_ESTADO_DISPOSITIVOS } from "./mqtt/device-status.js";
import { buildMqttOptions } from "./mqtt/mqtt-options.js";

const app = express();
app.use(express.json());
app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/produccion", produccionRoutes);
app.use("/api/v1/comercial", comercialRoutes);
app.use("/api/v1/inventario", inventarioRoutes);
app.use("/api/v1/galpones", galponesRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/consolidacion", consolidacionRoutes);
app.use("/api/v1/auditoria", auditoriaRoutes);
app.use(errorMiddleware);

const client: MqttClient = mqtt.connect(
  env.mqttUrl,
  buildMqttOptions({
    clientId: env.mqttClientId,
    username: env.mqttUsername,
    password: env.mqttPassword,
  }),
);

const topicsToSubscribe = [env.mqttTopic, TOPICO_ESTADO_DISPOSITIVOS];

client.on("connect", () => {
  console.log("MQTT: Conectado al broker MQTT");
  deviceTracker.setBrokerConnected(true);
  client.subscribe(topicsToSubscribe, (error) => {
    if (error) {
      console.error(`MQTT: Error al suscribirse a los tópicos:`, error.message);
    }
  });
});

client.on("reconnect", () => {
  console.log("MQTT: Reconectando al broker MQTT...");
});

client.on("close", () => {
  console.error("MQTT: Desconectado del broker MQTT");
  deviceTracker.setBrokerConnected(false);
});

client.on("message", (topic, message, packet) => {
  void handleProductionMessage(topic, message, packet.retain);
});

client.on("error", (error) => {
  console.error("MQTT:", error.message);
});

const server = app.listen(env.port, () => {
  console.log(`Backend corriendo en puerto ${env.port}`);
});

async function shutdown(): Promise<void> {
  server.close();
  // Las conexiones SSE de /produccion/eventos no terminan solas.
  server.closeAllConnections();
  await client.endAsync();
  await prisma.$disconnect();
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());