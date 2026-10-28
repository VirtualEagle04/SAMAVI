import { Router } from "express";
import { authenticate, requirePermission } from "../../middleware/auth.middleware.js";
import { getAuditoriaOpcionesController, listAuditoriaController } from "./auditoria.controller.js";

export const auditoriaRoutes = Router();
auditoriaRoutes.use(authenticate, requirePermission("VER_AUDITORIA"));

auditoriaRoutes.get("/", listAuditoriaController);
auditoriaRoutes.get("/opciones", getAuditoriaOpcionesController);
