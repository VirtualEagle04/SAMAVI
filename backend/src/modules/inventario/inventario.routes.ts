import multer from "multer";
import { Router, type NextFunction, type Request, type Response } from "express";
import { authenticate, requirePermission } from "../../middleware/auth.middleware.js";
import { AppError } from "../../shared/errors/app-error.js";
import {
  createCompraController,
  createInsumoController,
  createMovimientoController,
  createProveedorController,
  deactivateInsumoController,
  deactivateProveedorController,
  getCompraReceiptController,
  getInsumoController,
  getStockController,
  listComprasController,
  listInsumosController,
  listMovimientosController,
  listProveedoresController,
  listStockController,
  updateInsumoController,
  updateProveedorController,
} from "./inventario.controller.js";

const allowedMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
const uploadReceipt = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new AppError(400, "El recibo debe ser un PDF, JPG o PNG"));
      return;
    }
    callback(null, true);
  },
});

function receiptUpload(request: Request, response: Response, next: NextFunction): void {
  uploadReceipt.single("recibo")(request, response, (error: unknown) => {
    if (!error) {
      next();
      return;
    }
    if (error instanceof AppError) {
      next(error);
      return;
    }
    next(new AppError(400, "El recibo debe ser un PDF, JPG o PNG de máximo 5 MB"));
  });
}

export const inventarioRoutes = Router();
inventarioRoutes.use(authenticate);
inventarioRoutes.use(requirePermission("GESTIONAR_INVENTARIO"));

inventarioRoutes.get("/insumos", listInsumosController);
inventarioRoutes.post("/insumos", createInsumoController);
inventarioRoutes.get("/insumos/:id", getInsumoController);
inventarioRoutes.put("/insumos/:id", updateInsumoController);
inventarioRoutes.delete("/insumos/:id", deactivateInsumoController);

inventarioRoutes.get("/stock", listStockController);
inventarioRoutes.get("/stock/:id", getStockController);
inventarioRoutes.get("/stock/:id/movimientos", listMovimientosController);

inventarioRoutes.get("/compras", listComprasController);
inventarioRoutes.post("/compras", receiptUpload, createCompraController);
inventarioRoutes.get("/compras/:id/recibo", getCompraReceiptController);

inventarioRoutes.post("/movimientos", createMovimientoController);

inventarioRoutes.get("/proveedores", listProveedoresController);
inventarioRoutes.post("/proveedores", createProveedorController);
inventarioRoutes.put("/proveedores/:id", updateProveedorController);
inventarioRoutes.delete("/proveedores/:id", deactivateProveedorController);
