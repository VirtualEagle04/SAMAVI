import type { Request, Response } from "express";
import { parseProductionCountInput } from "./produccion.schemas.js";
import { parseDailyCloseInput } from "./produccion.schemas.js";
import {
  closeDailyProduction,
  listCategorias,
  listCierres,
  listCounts,
  listGalpones,
  registerCount,
} from "./produccion.service.js";
import { deviceTracker } from "../../mqtt/device-status.js";

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
  response.status(200).json(await closeDailyProduction(input));
}

export async function getDeviceStatusController(_request: Request, response: Response): Promise<void> {
  response.status(200).json(deviceTracker.getStatus());
}