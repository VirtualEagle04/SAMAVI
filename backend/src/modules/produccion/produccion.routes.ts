import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/auth.middleware.js";
import {
	closeDailyProductionController,
	createCountController,
	listCountsController,
} from "./produccion.controller.js";

export const produccionRoutes = Router();
produccionRoutes.use(authenticate, requireRole("Administrador", "Galponero"));
produccionRoutes.get("/conteos", listCountsController);
produccionRoutes.post("/conteos", createCountController);
produccionRoutes.post("/cierres", closeDailyProductionController);