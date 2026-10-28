import type { Request, Response } from "express";
import { auditContext } from "../../shared/audit/auditoria.js";
import {
  cambiarGallinas,
  getGalpon,
  listGalpones,
  registrarAlimentacion,
} from "./galpones.service.js";
import { parseCambioGallinasInput, parseId } from "./galpones.schemas.js";

export async function listGalponesController(_request: Request, response: Response): Promise<void> {
  response.json(await listGalpones());
}

export async function getGalponController(request: Request, response: Response): Promise<void> {
  response.json(await getGalpon(parseId(request.params.id, "id")));
}

export async function registrarAlimentacionController(request: Request, response: Response): Promise<void> {
  response.status(201).json(await registrarAlimentacion(parseId(request.params.id, "id"), auditContext(request)));
}

export async function cambiarGallinasController(request: Request, response: Response): Promise<void> {
  response.json(await cambiarGallinas(
    parseId(request.params.id, "id"),
    parseCambioGallinasInput(request.body),
    auditContext(request),
  ));
}
