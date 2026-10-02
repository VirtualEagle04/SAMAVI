import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../shared/errors/app-error.js";
import {
  createCompra,
  createInsumo,
  createMovimiento,
  createProveedor,
  deactivateInsumo,
  deactivateProveedor,
  getCompraReceipt,
  getInsumo,
  getStock,
  listCompras,
  listInsumos,
  listMovimientos,
  listProveedores,
  listStock,
  updateInsumo,
  updateProveedor,
} from "./inventario.service.js";
import {
  parseCompraInput,
  parseId,
  parseInsumoInput,
  parseInventarioFilters,
  parseMovimientoInput,
  parseProveedorInput,
} from "./inventario.schemas.js";

function authUserId(request: Request): number {
  if (!request.auth) throw new AppError(401, "Token requerido");
  return request.auth.id;
}

export async function listInsumosController(_request: Request, response: Response): Promise<void> {
  response.json(await listInsumos());
}

export async function getInsumoController(request: Request, response: Response): Promise<void> {
  response.json(await getInsumo(parseId(request.params.id, "id")));
}

export async function createInsumoController(request: Request, response: Response): Promise<void> {
  response.status(201).json(await createInsumo(parseInsumoInput(request.body)));
}

export async function updateInsumoController(request: Request, response: Response): Promise<void> {
  response.json(await updateInsumo(parseId(request.params.id, "id"), parseInsumoInput(request.body)));
}

export async function deactivateInsumoController(request: Request, response: Response): Promise<void> {
  await deactivateInsumo(parseId(request.params.id, "id"));
  response.status(204).send();
}

export async function listStockController(request: Request, response: Response): Promise<void> {
  const filters = parseInventarioFilters(request.query);
  response.json(await listStock(filters));
}

export async function getStockController(request: Request, response: Response): Promise<void> {
  response.json(await getStock(parseId(request.params.id, "id")));
}

export async function listMovimientosController(request: Request, response: Response): Promise<void> {
  const filters = parseInventarioFilters(request.query);
  response.json(await listMovimientos(parseId(request.params.id, "id"), filters));
}

export async function listComprasController(request: Request, response: Response): Promise<void> {
  response.json(await listCompras(parseInventarioFilters(request.query)));
}

export async function createCompraController(request: Request, response: Response): Promise<void> {
  response.status(201).json(await createCompra(parseCompraInput(request.body), authUserId(request), request.file));
}

export async function getCompraReceiptController(request: Request, response: Response): Promise<void> {
  const receipt = await getCompraReceipt(parseId(request.params.id, "id"));
  response.type(receipt.reciboMimeType!);
  if (receipt.reciboNombreArchivo) response.setHeader("Content-Disposition", `inline; filename="${receipt.reciboNombreArchivo}"`);
  response.send(receipt.reciboImagen);
}

export async function createMovimientoController(request: Request, response: Response): Promise<void> {
  response.status(201).json(await createMovimiento(parseMovimientoInput(request.body), authUserId(request)));
}

export async function listProveedoresController(_request: Request, response: Response): Promise<void> {
  response.json(await listProveedores());
}

export async function createProveedorController(request: Request, response: Response): Promise<void> {
  response.status(201).json(await createProveedor(parseProveedorInput(request.body)));
}

export async function updateProveedorController(request: Request, response: Response): Promise<void> {
  response.json(await updateProveedor(parseId(request.params.id, "id"), parseProveedorInput(request.body)));
}

export async function deactivateProveedorController(request: Request, response: Response): Promise<void> {
  await deactivateProveedor(parseId(request.params.id, "id"));
  response.status(204).send();
}

export function handleReceiptUploadError(error: unknown, _request: Request, _response: Response, next: NextFunction): void {
  if (error instanceof AppError) {
    next(error);
    return;
  }
  next(new AppError(400, "El recibo debe ser un PDF, JPG o PNG de máximo 5 MB"));
}
