import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/auth.middleware.js";
import {
  closeDailyProductionController,
  createCountController,
  getDeviceStatusController,
  listCategoriasController,
  listCierresController,
  listCountsController,
  listGalponesController,
} from "./produccion.controller.js";

export const produccionRoutes = Router();
produccionRoutes.use(authenticate, requireRole("Administrador", "Galponero"));

produccionRoutes.get("/dispositivo-estado", getDeviceStatusController);
produccionRoutes.get("/galpones", listGalponesController);
produccionRoutes.get("/categorias", listCategoriasController);
produccionRoutes.get("/cierres", listCierresController);
produccionRoutes.get("/conteos", listCountsController);
produccionRoutes.post("/conteos", createCountController);
produccionRoutes.post("/cierres", closeDailyProductionController);