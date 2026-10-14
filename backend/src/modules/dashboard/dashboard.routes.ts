import { Router } from "express";
import { authenticate, requirePermission } from "../../middleware/auth.middleware.js";
import { getWeeklySummaryController } from "./dashboard.controller.js";

export const dashboardRoutes = Router();
dashboardRoutes.use(authenticate, requirePermission("VER_CIERRE"));

dashboardRoutes.get("/resumen-semanal", getWeeklySummaryController);
