import type { Request, Response } from "express";
import { auditContext } from "../../shared/audit/auditoria.js";
import { parseProductionCountInput } from "./produccion.schemas.js";
import { parseDailyCloseInput } from "./produccion.schemas.js";
import {
  closeDailyProduction,
  listCategorias,
  listCierres,
  listCierresProduccion,
  listBodega,
  listCounts,
  listDailyCountSummary,
  listGalpones,
  registerCount,
} from "./produccion.service.js";
import { deviceTracker } from "../../mqtt/device-status.js";
import { onConteoRegistrado, onDispositivoEstado } from "./produccion.events.js";

function serializeCount<T extends { id: bigint }>(count: T) {
  return { ...count, id: count.id.toString() };
}

export async function createCountController(request: Request, response: Response): Promise<void> {
  const input = parseProductionCountInput(request.body);
  const count = await registerCount(input);
  response.status(201).json(serializeCount(count));
}

export async function listCountsController(request: Request, response: Response): Promise<void> {
  const galponIdParam = request.query.galponId ? Number(request.query.galponId) : undefined;
  const takeParam = request.query.limit ? Number(request.query.limit) : 200;
  const counts = await listCounts(galponIdParam, takeParam);
  response.status(200).json(counts.map(serializeCount));
}

export async function listGalponesController(_request: Request, response: Response): Promise<void> {
  const galpones = await listGalpones();
  response.status(200).json(galpones);
}

export async function listCategoriasController(_request: Request, response: Response): Promise<void> {
  const categorias = await listCategorias();
  response.status(200).json(categorias);
}

export async function listCierresController(request: Request, response: Response): Promise<void> {
  const galponId = request.query.galponId ? Number(request.query.galponId) : undefined;
  const fecha = typeof request.query.fecha === "string" ? request.query.fecha : undefined;
  const cierres = await listCierres(galponId, fecha);
  response.status(200).json(cierres);
}

export async function closeDailyProductionController(request: Request, response: Response): Promise<void> {
  const input = parseDailyCloseInput(request.body);
  response.status(200).json(await closeDailyProduction(input, auditContext(request)));
}

export async function getDeviceStatusController(_request: Request, response: Response): Promise<void> {
  response.status(200).json(deviceTracker.getStatus());
}

export async function listDailyCountSummaryController(_request: Request, response: Response): Promise<void> {
  response.status(200).json(await listDailyCountSummary());
}

export async function listCierresProduccionController(request: Request, response: Response): Promise<void> {
  const galponId = request.query.galponId ? Number(request.query.galponId) : undefined;
  const fecha = typeof request.query.fecha === "string" ? request.query.fecha : undefined;
  response.status(200).json(await listCierresProduccion(galponId, fecha));
}

export async function listBodegaController(request: Request, response: Response): Promise<void> {
  const galponId = request.query.galponId ? Number(request.query.galponId) : undefined;
  const fechaCorte = typeof request.query.fechaCorte === "string" ? request.query.fechaCorte : undefined;
  response.status(200).json(await listBodega(galponId, fechaCorte));
}

const SSE_KEEPALIVE_MS = 25000;

export function streamProductionEventsController(request: Request, response: Response): void {
  response.status(200).set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  response.flushHeaders();
  response.write("retry: 3000\n\n");

  const send = (event: string, data: unknown) => {
    response.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // El estado actual va primero para que el cliente quede al día al (re)conectarse.
  send("dispositivo", deviceTracker.getStatus());
  const unsubscribeConteo = onConteoRegistrado((event) => send("conteo", event));
  const unsubscribeDispositivo = onDispositivoEstado((status) => send("dispositivo", status));

  // Comentario periódico para que proxies e intermediarios no cierren la conexión inactiva.
  const keepAlive = setInterval(() => {
    response.write(": keepalive\n\n");
  }, SSE_KEEPALIVE_MS);

  request.on("close", () => {
    clearInterval(keepAlive);
    unsubscribeConteo();
    unsubscribeDispositivo();
  });
}
