import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const dotenvConfig = dotenv.config({
  path: resolve(repositoryRoot, ".env"),
  quiet: true,
});

dotenvExpand.expand(dotenvConfig);

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
  jwtExpiresIn: process.env.JWT_EXPIRES_IN,
  port: Number(process.env.PORT ?? 3001),
  mqttUrl: required("MQTT_URL"),
  mqttTopic: required("MQTT_TOPIC"),
  mqttClientId: required("MQTT_CLIENT_ID"),
};

if (env.jwtSecret.length < 32) {
  throw new Error("JWT_SECRET debe tener al menos 32 caracteres");
}