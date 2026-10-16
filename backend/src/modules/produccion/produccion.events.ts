import { EventEmitter } from "node:events";

export type ConteoRegistradoEvent = {
  id: string;
  galponId: number;
  categoriaPeso: string;
  cantidad: number;
  timestamp: string;
};

type ConteoListener = (event: ConteoRegistradoEvent) => void;

const CONTEO_REGISTRADO = "conteo-registrado";

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
