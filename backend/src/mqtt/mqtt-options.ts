import type { IClientOptions } from "mqtt";

export interface MqttConnectionConfig {
  clientId: string;
  username: string | undefined;
  password: string | undefined;
}

// Sin usuario el broker local (anónimo) acepta la conexión; en producción
// Mosquitto exige usuario y contraseña (docs/protocols/mqtt.md).
export function buildMqttOptions(config: MqttConnectionConfig): IClientOptions {
  const options: IClientOptions = { clientId: config.clientId };

  if (!config.username && !config.password) {
    return options;
  }

  if (!config.username || !config.password) {
    throw new Error("MQTT_USERNAME y MQTT_PASSWORD deben definirse juntas");
  }

  options.username = config.username;
  options.password = config.password;
  return options;
}
