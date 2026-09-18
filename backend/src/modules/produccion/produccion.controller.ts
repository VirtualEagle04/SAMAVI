import type { Request, Response } from "express";
import { parseProductionCountInput } from "./produccion.schemas.js";
import { parseDailyCloseInput } from "./produccion.schemas.js";
import { closeDailyProduction, listCounts, registerCount } from "./produccion.service.js";

function serializeCount<T extends { id: bigint }>(count: T) {
  return { ...count, id: count.id.toString() };
}

export async function createCountController(request: Request, response: Response): Promise<void> {
  const input = parseProductionCountInput(request.body);
  const count = await registerCount(input);
  response.status(201).json(serializeCount(count));
}

export async function listCountsController(_request: Request, response: Response): Promise<void> {
  const counts = await listCounts();
  response.status(200).json(counts.map(serializeCount));
}

export async function closeDailyProductionController(request: Request, response: Response): Promise<void> {
  const input = parseDailyCloseInput(request.body);
  response.status(200).json(await closeDailyProduction(input));
}