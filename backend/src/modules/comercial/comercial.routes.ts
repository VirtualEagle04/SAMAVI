import { Router } from "express";
import { authenticate, requirePermission } from "../../middleware/auth.middleware.js";
import {
  changePedidoStatusController,
  createMayoristaController,
  createPedidoController,
  createVentaController,
  deleteMayoristaController,
  getMayoristaController,
  getPedidoController,
  getVentaController,
  listMayoristasController,
  listPedidosController,
  listPreciosController,
  updateMayoristaController,
  updatePedidoController,
  upsertPrecioController,
} from "./comercial.controller.js";

export const comercialRoutes = Router();
comercialRoutes.use(authenticate);

comercialRoutes.get("/mayoristas", requirePermission("INGRESAR_PEDIDO"), listMayoristasController);
comercialRoutes.post("/mayoristas", requirePermission("INGRESAR_PEDIDO"), createMayoristaController);
comercialRoutes.get("/mayoristas/:id", requirePermission("INGRESAR_PEDIDO"), getMayoristaController);
comercialRoutes.patch("/mayoristas/:id", requirePermission("INGRESAR_PEDIDO"), updateMayoristaController);
comercialRoutes.delete("/mayoristas/:id", requirePermission("INGRESAR_PEDIDO"), deleteMayoristaController);

comercialRoutes.get("/mayoristas/:mayoristaId/precios", requirePermission("INGRESAR_PEDIDO"), listPreciosController);
comercialRoutes.put("/mayoristas/:mayoristaId/precios", requirePermission("EDITAR_PRECIOS"), upsertPrecioController);

comercialRoutes.get("/pedidos", requirePermission("INGRESAR_PEDIDO"), listPedidosController);
comercialRoutes.post("/pedidos", requirePermission("INGRESAR_PEDIDO"), createPedidoController);
comercialRoutes.get("/pedidos/:id", requirePermission("INGRESAR_PEDIDO"), getPedidoController);
comercialRoutes.patch("/pedidos/:id", requirePermission("INGRESAR_PEDIDO"), updatePedidoController);
comercialRoutes.post("/pedidos/:id/estado", requirePermission("INGRESAR_PEDIDO"), changePedidoStatusController);

comercialRoutes.post("/pedidos/:pedidoId/ventas", requirePermission("REGISTRAR_VENTA"), createVentaController);
comercialRoutes.get("/pedidos/:pedidoId/ventas", requirePermission("REGISTRAR_VENTA"), getVentaController);
