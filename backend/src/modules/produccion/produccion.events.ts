import { EventEmitter } from "node:events";
import type { DeviceStatus } from "../../mqtt/device-status.js";

export type ConteoRegistradoEvent = {
  id: string;
  galponId: number;
  categoriaPeso: string;
  cantidad: number;
  timestamp: string;
};

type ConteoListener = (event: ConteoRegistradoEvent) => void;
type DispositivoListener = (status: DeviceStatus) => void;

const CONTEO_REGISTRADO = "conteo-registrado";
const DISPOSITIVO_ESTADO = "dispositivo-estado";

// Bus en memoria: avisa a los clientes SSE conectados a esta instancia del backend.
const emitter = new EventEmitter();
emitter.setMaxListeners(0);

export function emitConteoRegistrado(event: ConteoRegistradoEvent): void {
  emitter.emit(CONTEO_REGISTRADO, event);
}

export function onConteoRegistrado(listener: ConteoListener): () => void {
  emitter.on(CONTEO_REGISTRADO, listener);
  return () => {
    emitter.off(CONTEO_REGISTRADO, listener);
  };
}

export function emitDispositivoEstado(status: DeviceStatus): void {
  emitter.emit(DISPOSITIVO_ESTADO, status);
}

export function onDispositivoEstado(listener: DispositivoListener): () => void {
  emitter.on(DISPOSITIVO_ESTADO, listener);
  return () => {
    emitter.off(DISPOSITIVO_ESTADO, listener);
  };
}
