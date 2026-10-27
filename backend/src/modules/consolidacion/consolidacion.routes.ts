import { Router } from "express";
import { authenticate, requirePermission } from "../../middleware/auth.middleware.js";
import {
  cerrarSemanaController,
  createGastoController,
  deleteGastoController,
  getHistorialController,
  getSemanaController,
  listCierresController,
  listGastosController,
  listSociosController,
  reabrirSemanaController,
} from "./consolidacion.controller.js";

export const consolidacionRoutes = Router();
consolidacionRoutes.use(authenticate);

consolidacionRoutes.get("/cierres", requirePermission("VER_CIERRE"), listCierresController);
consolidacionRoutes.get("/historial", requirePermission("VER_CIERRE"), getHistorialController);
consolidacionRoutes.get("/semanas/:desde", requirePermission("VER_CIERRE"), getSemanaController);
consolidacionRoutes.post("/semanas/:desde/cierre", requirePermission("CERRAR_SEMANA"), cerrarSemanaController);
consolidacionRoutes.delete("/semanas/:desde/cierre", requirePermission("CERRAR_SEMANA"), reabrirSemanaController);

consolidacionRoutes.get("/gastos", requirePermission("VER_CIERRE"), listGastosController);
consolidacionRoutes.post("/gastos", requirePermission("INGRESAR_GASTO"), createGastoController);
consolidacionRoutes.delete("/gastos/:id", requirePermission("INGRESAR_GASTO"), deleteGastoController);

consolidacionRoutes.get("/socios", requirePermission("VER_CIERRE"), listSociosController);
