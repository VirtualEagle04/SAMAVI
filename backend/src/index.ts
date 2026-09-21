import express from "express";
import mqtt, { type MqttClient } from "mqtt";
import { env } from "./config/env.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { produccionRoutes } from "./modules/produccion/produccion.routes.js";
import { comercialRoutes } from "./modules/comercial/comercial.routes.js";
import { prisma } from "./database/prisma.js";
import { handleProductionMessage } from "./mqtt/production-mqtt.handler.js";

const app = express();
app.use(express.json());
app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/produccion", produccionRoutes);
app.use("/api/v1/comercial", comercialRoutes);
app.use(errorMiddleware);

const client: MqttClient = mqtt.connect(env.mqttUrl, { clientId: env.mqttClientId });

client.on("connect", () => {
  console.log("MQTT: Conectado al broker MQTT");
  client.subscribe(env.mqttTopic, (error) => {
    if (error) {
      console.error(`MQTT: Error al suscribirse a ${env.mqttTopic}:`, error.message);
    }
  });
});

client.on("reconnect", () => {
  console.log("MQTT: Reconectando al broker MQTT...");
});

client.on("close", () => {
  console.error("MQTT: Desconectado del broker MQTT");
});

client.on("message", (_topic, message) => {
  void handleProductionMessage(message);
});

client.on("error", (error) => {
  console.error("MQTT:", error.message);
});

const server = app.listen(env.port, () => {
  console.log(`Backend corriendo en puerto ${env.port}`);
});

async function shutdown(): Promise<void> {
  server.close();
  await client.endAsync();
  await prisma.$disconnect();
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());