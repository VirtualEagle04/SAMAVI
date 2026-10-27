import type { Request, Response } from "express";
import { AppError } from "../../shared/errors/app-error.js";
import { parseDesde, parseGastoInput, parseHistorialQuery, parseId } from "./consolidacion.schemas.js";
import {
  cerrarSemana,
  createGasto,
  deleteGasto,
  getHistorial,
  getSemana,
  listCierres,
  listGastos,
  listSocios,
  reabrirSemana,
} from "./consolidacion.service.js";

function currentUserId(request: Request): number {
  if (!request.auth) {
    throw new AppError(401, "Token requerido");
  }
  return request.auth.id;
}

export async function listCierresController(_request: Request, response: Response): Promise<void> {
  response.json(await listCierres());
}

export async function getSemanaController(request: Request, response: Response): Promise<void> {
  response.json(await getSemana(parseDesde(request.params.desde)));
}

export async function getHistorialController(request: Request, response: Response): Promise<void> {
  const { hasta, semanas } = parseHistorialQuery(request.query);
  response.json(await getHistorial(hasta, semanas));
}

export async function cerrarSemanaController(request: Request, response: Response): Promise<void> {
  response.status(201).json(await cerrarSemana(parseDesde(request.params.desde), currentUserId(request), request.ip));
}

export async function reabrirSemanaController(request: Request, response: Response): Promise<void> {
  response.json(await reabrirSemana(parseDesde(request.params.desde), currentUserId(request), request.ip));
}

export async function listGastosController(request: Request, response: Response): Promise<void> {
  response.json(await listGastos(parseDesde(request.query.desde)));
}

export async function createGastoController(request: Request, response: Response): Promise<void> {
  response.status(201).json(await createGasto(parseGastoInput(request.body), currentUserId(request)));
}

export async function deleteGastoController(request: Request, response: Response): Promise<void> {
  await deleteGasto(parseId(request.params.id, "id"));
  response.status(204).end();
}

export async function listSociosController(_request: Request, response: Response): Promise<void> {
  response.json(await listSocios());
}
