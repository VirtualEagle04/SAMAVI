import type { Request, Response } from "express";
import { AppError } from "../../shared/errors/app-error.js";
import {
  changePedidoStatus,
  createMayorista,
  createPedido,
  createVenta,
  deleteMayorista,
  getMayorista,
  getPedido,
  getVentaByPedido,
  listMayoristas,
  listPedidos,
  listPrecios,
  updateMayorista,
  updatePedido,
  upsertPrecio,
  type PedidoFilters,
} from "./comercial.service.js";
import {
  parseEstado,
  parseId,
  parseMayoristaInput,
  parsePedidoInput,
  parsePrecioInput,
  parseVentaInput,
} from "./comercial.schemas.js";

function optionalPositiveInteger(value: unknown, field: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  return parseId(String(value), field);
}

export async function listMayoristasController(_request: Request, response: Response): Promise<void> {
  response.json(await listMayoristas());
}

export async function getMayoristaController(request: Request, response: Response): Promise<void> {
  response.json(await getMayorista(parseId(request.params.id, "id")));
}

export async function createMayoristaController(request: Request, response: Response): Promise<void> {
  response.status(201).json(await createMayorista(parseMayoristaInput(request.body)));
}

export async function updateMayoristaController(request: Request, response: Response): Promise<void> {
  response.json(await updateMayorista(parseId(request.params.id, "id"), parseMayoristaInput(request.body)));
}

export async function deleteMayoristaController(request: Request, response: Response): Promise<void> {
  await deleteMayorista(parseId(request.params.id, "id"));
  response.status(204).send();
}

export async function listPreciosController(request: Request, response: Response): Promise<void> {
  response.json(await listPrecios(parseId(request.params.mayoristaId, "mayoristaId")));
}

export async function upsertPrecioController(request: Request, response: Response): Promise<void> {
  response.json(await upsertPrecio(
    parseId(request.params.mayoristaId, "mayoristaId"),
    parsePrecioInput(request.body),
  ));
}

export async function listPedidosController(request: Request, response: Response): Promise<void> {
  const estado = request.query.estado;
  if (estado !== undefined && typeof estado !== "string") {
    throw new AppError(400, "estado inválido");
  }
  const mayoristaId = optionalPositiveInteger(request.query.mayoristaId, "mayoristaId");
  const filters: PedidoFilters = {};
  if (estado !== undefined) {
    filters.estado = estado;
  }
  if (mayoristaId !== undefined) {
    filters.mayoristaId = mayoristaId;
  }
  response.json(await listPedidos(filters));
}

export async function createPedidoController(request: Request, response: Response): Promise<void> {
  response.status(201).json(await createPedido(parsePedidoInput(request.body)));
}

export async function getPedidoController(request: Request, response: Response): Promise<void> {
  response.json(await getPedido(parseId(request.params.id, "id")));
}

export async function updatePedidoController(request: Request, response: Response): Promise<void> {
  response.json(await updatePedido(parseId(request.params.id, "id"), parsePedidoInput(request.body)));
}

export async function changePedidoStatusController(request: Request, response: Response): Promise<void> {
  const estado = parseEstado(request.body?.estado);
  response.json(await changePedidoStatus(parseId(request.params.id, "id"), estado));
}

export async function createVentaController(request: Request, response: Response): Promise<void> {
  response.status(201).json(await createVenta(
    parseId(request.params.pedidoId, "pedidoId"),
    parseVentaInput(request.body),
  ));
}

export async function getVentaController(request: Request, response: Response): Promise<void> {
  response.json(await getVentaByPedido(parseId(request.params.pedidoId, "pedidoId")));
}
