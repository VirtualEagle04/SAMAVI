import { describe, it, expect } from "vitest";
import { buildMqttOptions } from "../../../src/mqtt/mqtt-options.js";

describe("buildMqttOptions", () => {
  it("se conecta sin credenciales si no hay usuario ni contraseña", () => {
    expect(
      buildMqttOptions({ clientId: "samavi-backend", username: undefined, password: undefined }),
    ).toEqual({ clientId: "samavi-backend" });
  });

  it("incluye usuario y contraseña cuando ambos están definidos", () => {
    expect(
      buildMqttOptions({ clientId: "samavi-backend", username: "backend", password: "secreto" }),
    ).toEqual({ clientId: "samavi-backend", username: "backend", password: "secreto" });
  });

  it("rechaza un usuario sin contraseña o una contraseña sin usuario", () => {
    expect(() =>
      buildMqttOptions({ clientId: "samavi-backend", username: "backend", password: undefined }),
    ).toThrow("MQTT_USERNAME y MQTT_PASSWORD deben definirse juntas");
    expect(() =>
      buildMqttOptions({ clientId: "samavi-backend", username: undefined, password: "secreto" }),
    ).toThrow("MQTT_USERNAME y MQTT_PASSWORD deben definirse juntas");
  });
});
