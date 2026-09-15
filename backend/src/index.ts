import express from "express";
import mqtt, { type MqttClient } from "mqtt";

const app = express();
const port = Number(process.env.PORT ?? 3001);
const mqttUrl = process.env.MQTT_URL ?? "mqtt://localhost:1883";
const mqttTopic = process.env.MQTT_TOPIC ?? "samavi/conteo";
const mqttClientId = process.env.MQTT_CLIENT_ID ?? "samavi-backend";
const client: MqttClient = mqtt.connect(mqttUrl, { clientId: mqttClientId });

client.on("connect", () => {
  console.log("MQTT: Conectado al broker MQTT");
  client.subscribe(mqttTopic, (error) => {
    if (error) {
      console.error(`MQTT: Error al suscribirse a ${mqttTopic}:`, error.message);
    }
  });
});

client.on("reconnect", () => {
  console.log("MQTT: Reconectando al broker MQTT...");
});

client.on("close", () => {
  console.error("MQTT: Desconectado del broker MQTT");
});

client.on("message", (topic, message) => {
  try {
    const data: unknown = JSON.parse(message.toString());
    console.log(`MQTT: Recibido de ${topic}: `, data);
  } catch {
    console.error(`MQTT: Payload JSON inválido recibido de ${topic}`);
  }
});

client.on("error", (error) => {
  console.error("MQTT:", error.message);
});

app.listen(port, () => {
  console.log(`Backend corriendo en puerto ${port}`);
});