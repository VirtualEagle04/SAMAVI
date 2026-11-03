import { describe, it, expect } from "vitest";
import { LoginLimiter } from "../../../src/shared/security/login-limiter.js";

const MINUTO = 60_000;

function limiter() {
  const reloj = { ahora: 0 };
  const instancia = new LoginLimiter({
    ventanaMs: 15 * MINUTO,
    maxPorLogin: 3,
    maxPorIp: 5,
    now: () => reloj.ahora,
  });
  return { reloj, instancia };
}

describe("LoginLimiter", () => {
  it("permite intentar mientras no se llega al máximo por login", () => {
    const { instancia } = limiter();
    instancia.registrarFallo("1.1.1.1", "ana");
    instancia.registrarFallo("1.1.1.1", "ana");
    expect(instancia.segundosDeEspera("1.1.1.1", "ana")).toBeNull();
  });

  it("bloquea el login al llegar al máximo, también desde otra IP", () => {
    const { instancia } = limiter();
    for (let i = 0; i < 3; i += 1) instancia.registrarFallo(`10.0.0.${i}`, "ana");
    expect(instancia.segundosDeEspera("2.2.2.2", "ana")).toBe(15 * 60);
    expect(instancia.segundosDeEspera("2.2.2.2", "otro")).toBeNull();
  });

  it("bloquea la IP al llegar al máximo, también con otros logins", () => {
    const { instancia } = limiter();
    for (let i = 0; i < 5; i += 1) instancia.registrarFallo("1.1.1.1", `usuario${i}`);
    expect(instancia.segundosDeEspera("1.1.1.1", "nuevo")).not.toBeNull();
    expect(instancia.segundosDeEspera("3.3.3.3", "nuevo")).toBeNull();
  });

  it("calcula la espera hasta que vence el fallo más antiguo que cuenta", () => {
    const { reloj, instancia } = limiter();
    instancia.registrarFallo("1.1.1.1", "ana");
    reloj.ahora = 5 * MINUTO;
    instancia.registrarFallo("1.1.1.1", "ana");
    instancia.registrarFallo("1.1.1.1", "ana");
    expect(instancia.segundosDeEspera("1.1.1.1", "ana")).toBe(10 * 60);

    reloj.ahora = 15 * MINUTO;
    expect(instancia.segundosDeEspera("1.1.1.1", "ana")).toBeNull();
  });

  it("un acceso correcto limpia los fallos del login pero no los de la IP", () => {
    const { instancia } = limiter();
    for (let i = 0; i < 3; i += 1) instancia.registrarFallo("1.1.1.1", "ana");
    instancia.registrarExito("ana");
    expect(instancia.segundosDeEspera("9.9.9.9", "ana")).toBeNull();

    instancia.registrarFallo("1.1.1.1", "luis");
    instancia.registrarFallo("1.1.1.1", "luis");
    // 3 + 2 fallos desde 1.1.1.1 llegan al máximo por IP.
    expect(instancia.segundosDeEspera("1.1.1.1", "ana")).not.toBeNull();
  });
});
