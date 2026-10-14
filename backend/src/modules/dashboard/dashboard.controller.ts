import type { Request, Response } from "express";
import { parseWeeklySummaryQuery } from "./dashboard.schemas.js";
import { getWeeklySummary } from "./dashboard.service.js";

export async function getWeeklySummaryController(request: Request, response: Response): Promise<void> {
  const { desde } = parseWeeklySummaryQuery(request.query);
  response.status(200).json(await getWeeklySummary(desde));
}
