import { Router } from "express";
import { authenticate, requirePermission } from "../../middleware/auth.middleware.js";
import {
  cambiarGallinasController,
  getGalponController,
  listGalponesController,
  registrarAlimentacionController,
} from "./galpones.controller.js";

export const galponesRoutes = Router();
galponesRoutes.use(authenticate, requirePermission("GESTIONAR_GALPONES"));

galponesRoutes.get("/", listGalponesController);
galponesRoutes.get("/:id", getGalponController);
galponesRoutes.post("/:id/alimentacion", registrarAlimentacionController);
galponesRoutes.patch("/:id/gallinas", cambiarGallinasController);
