import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
dotenv.config({ path: resolve(repositoryRoot, ".env") });

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}`);
  }
  return value;
}

export const env = {
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "1h",
  port: Number(process.env.PORT ?? 3001),
  mqttUrl: process.env.MQTT_URL ?? "mqtt://localhost:1883",
  mqttTopic: process.env.MQTT_TOPIC ?? "samavi/conteo",
  mqttClientId: process.env.MQTT_CLIENT_ID ?? "samavi-backend",
};

if (env.jwtSecret.length < 32) {
  throw new Error("JWT_SECRET debe tener al menos 32 caracteres");
}