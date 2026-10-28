import type { Request, Response } from "express";
import { parseAuditoriaQuery } from "./auditoria.schemas.js";
import { getAuditoriaOpciones, listAuditoria } from "./auditoria.service.js";

export async function listAuditoriaController(request: Request, response: Response): Promise<void> {
  response.json(await listAuditoria(parseAuditoriaQuery(request.query)));
}

export async function getAuditoriaOpcionesController(_request: Request, response: Response): Promise<void> {
  response.json(await getAuditoriaOpciones());
}
