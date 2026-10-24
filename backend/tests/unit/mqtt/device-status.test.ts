import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  DeviceStatusTracker,
  parseEstadoPublicado,
  parseTopicoEstado,
} from "../../../src/mqtt/device-status.js";

const online = { estado: "online" as const, galponId: 1, ip: "192.168.1.50" };
const offline = { ...online, estado: "offline" as const };

describe("parseTopicoEstado", () => {
  it("extrae el id del dispositivo", () => {
    expect(parseTopicoEstado("samavi/dispositivos/8C94DF6BEA44/estado")).toBe("8C94DF6BEA44");
  });

  it("ignora otros tópicos", () => {
    expect(parseTopicoEstado("samavi/conteo")).toBeNull();
    expect(parseTopicoEstado("samavi/dispositivos/estado")).toBeNull();
    expect(parseTopicoEstado("samavi/dispositivos/a/b/estado")).toBeNull();
  });
});

describe("parseEstadoPublicado", () => {
  it("acepta un estado completo", () => {
    expect(parseEstadoPublicado(JSON.stringify(online))).toEqual(online);
  });

  it("deja en null los campos opcionales inválidos", () => {
    expect(parseEstadoPublicado('{"estado":"offline","galponId":-1,"ip":""}')).toEqual({
      estado: "offline",
      galponId: null,
      ip: null,
    });
  });

  it("rechaza JSON inválido o un estado desconocido", () => {
    expect(parseEstadoPublicado("online")).toBeNull();
    expect(parseEstadoPublicado("null")).toBeNull();
    expect(parseEstadoPublicado('{"estado":"dormido"}')).toBeNull();
  });
});

describe("DeviceStatusTracker", () => {
  let tracker: DeviceStatusTracker;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-23T10:00:00.000Z"));
    vi.spyOn(console, "log").mockImplementation(() => {});
    tracker = new DeviceStatusTracker();
    tracker.setBrokerConnected(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("sin dispositivos conocidos no hay conexión", () => {
    expect(tracker.getStatus()).toEqual({ brokerConnected: true, connected: false, dispositivos: [] });
  });

  it("lista el dispositivo en línea con su galpón, IP y hora del cambio", () => {
    tracker.registrarEstado("ESP1", online, false);

    expect(tracker.getStatus()).toEqual({
      brokerConnected: true,
      connected: true,
      dispositivos: [
        { id: "ESP1", galponId: 1, ip: "192.168.1.50", conectado: true, desde: "2026-10-23T10:00:00.000Z" },
      ],
    });
  });

  it("pasa a desconectado con el LWT", () => {
    tracker.registrarEstado("ESP1", online, false);
    vi.advanceTimersByTime(30000);
    tracker.registrarEstado("ESP1", offline, false);

    const status = tracker.getStatus();
    expect(status.connected).toBe(false);
    expect(status.dispositivos[0]).toMatchObject({ conectado: false, desde: "2026-10-23T10:00:30.000Z" });
  });

  it("un estado retenido no tiene hora conocida", () => {
    tracker.registrarEstado("ESP1", offline, true);

    expect(tracker.getStatus().dispositivos[0]).toMatchObject({ conectado: false, desde: null });
  });

  it("al reenviar el mismo estado retenido conserva la hora del cambio", () => {
    tracker.registrarEstado("ESP1", online, false);
    vi.advanceTimersByTime(30000);
    tracker.registrarEstado("ESP1", online, true);

    expect(tracker.getStatus().dispositivos[0].desde).toBe("2026-10-23T10:00:00.000Z");
  });

  it("sin broker ningún dispositivo está conectado", () => {
    tracker.registrarEstado("ESP1", online, false);
    tracker.setBrokerConnected(false);

    const status = tracker.getStatus();
    expect(status.connected).toBe(false);
    expect(status.dispositivos[0].conectado).toBe(false);
  });

  it("olvida un dispositivo", () => {
    tracker.registrarEstado("ESP1", online, false);
    tracker.olvidar("ESP1");

    expect(tracker.getStatus().dispositivos).toEqual([]);
  });
});

describe("DeviceStatusTracker → onChange", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("avisa con el estado completo cuando el dispositivo se conecta o se cae", () => {
    const onChange = vi.fn();
    const tracker = new DeviceStatusTracker(onChange);
    tracker.setBrokerConnected(true);
    onChange.mockClear();

    tracker.registrarEstado("ESP1", online, false);
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ connected: true }));

    tracker.registrarEstado("ESP1", offline, false);
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ connected: false }));
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("no avisa si nada cambió", () => {
    const onChange = vi.fn();
    const tracker = new DeviceStatusTracker(onChange);
    tracker.setBrokerConnected(true);
    tracker.registrarEstado("ESP1", online, false);
    onChange.mockClear();

    tracker.registrarEstado("ESP1", online, true);
    tracker.setBrokerConnected(true);
    tracker.olvidar("OTRO");

    expect(onChange).not.toHaveBeenCalled();
  });

  it("avisa cuando el backend pierde el broker", () => {
    const onChange = vi.fn();
    const tracker = new DeviceStatusTracker(onChange);
    tracker.setBrokerConnected(true);
    tracker.registrarEstado("ESP1", online, false);
    onChange.mockClear();

    tracker.setBrokerConnected(false);

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ brokerConnected: false, connected: false }));
  });
});
