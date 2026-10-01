import type { Request, Response } from "express";
import { AppError } from "../../shared/errors/app-error.js";
import {
  cambiarGallinas,
  getGalpon,
  listGalpones,
  registrarAlimentacion,
} from "./galpones.service.js";
import { parseCambioGallinasInput, parseId } from "./galpones.schemas.js";

function currentUserId(request: Request): number {
  if (!request.auth) {
    throw new AppError(401, "Token requerido");
  }
  return request.auth.id;
}

export async function listGalponesController(_request: Request, response: Response): Promise<void> {
  response.json(await listGalpones());
}

export async function getGalponController(request: Request, response: Response): Promise<void> {
  response.json(await getGalpon(parseId(request.params.id, "id")));
}

export async function registrarAlimentacionController(request: Request, response: Response): Promise<void> {
  response.status(201).json(await registrarAlimentacion(parseId(request.params.id, "id"), currentUserId(request)));
}

export async function cambiarGallinasController(request: Request, response: Response): Promise<void> {
  response.json(await cambiarGallinas(
    parseId(request.params.id, "id"),
    currentUserId(request),
    parseCambioGallinasInput(request.body),
    request.ip,
  ));
}
