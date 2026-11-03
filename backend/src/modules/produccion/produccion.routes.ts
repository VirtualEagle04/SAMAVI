import { Router } from "express";
import { authenticate, requirePermission } from "../../middleware/auth.middleware.js";
import {
  closeDailyProductionController,
  createCountController,
  getDeviceStatusController,
  listCategoriasController,
  listCierresController,
  listCierresProduccionController,
  listBodegaController,
  listCountsController,
  listDailyCountSummaryController,
  listGalponesController,
  streamProductionEventsController,
} from "./produccion.controller.js";

export const produccionRoutes = Router();
produccionRoutes.use(authenticate);

const verProduccion = requirePermission("VER_PRODUCCION");

produccionRoutes.get("/dispositivo-estado", verProduccion, getDeviceStatusController);
produccionRoutes.get("/eventos", verProduccion, streamProductionEventsController);
produccionRoutes.get("/galpones", verProduccion, listGalponesController);
produccionRoutes.get("/categorias", verProduccion, listCategoriasController);
produccionRoutes.get("/cierres", verProduccion, listCierresController);
produccionRoutes.get("/cierres-realizados", verProduccion, listCierresProduccionController);
produccionRoutes.get("/bodega", verProduccion, listBodegaController);
produccionRoutes.get("/conteos", verProduccion, listCountsController);
produccionRoutes.get("/conteos/resumen-diario", verProduccion, listDailyCountSummaryController);
produccionRoutes.post("/conteos", requirePermission("INGRESAR_CONTEO"), createCountController);
produccionRoutes.post("/cierres", requirePermission("REGISTRAR_CIERRE_DIARIO"), closeDailyProductionController);
