import { Router } from "express";
import { authenticate, requirePermission } from "../../middleware/auth.middleware.js";
import { PERMISO_GESTIONAR_USUARIOS } from "../../shared/security/roles.js";
import {
  borrarRolController,
  cambiarEstadoUsuarioController,
  crearRolController,
  crearUsuarioController,
  editarPermisoController,
  editarRolController,
  editarUsuarioController,
  getUsuarioController,
  listPermisosController,
  listRolesController,
  listUsuariosController,
  restablecerPasswordController,
} from "./usuarios.controller.js";

export const usuariosRoutes = Router();
usuariosRoutes.use(authenticate, requirePermission(PERMISO_GESTIONAR_USUARIOS));

// /roles y /permisos van antes de /:id.
usuariosRoutes.get("/roles", listRolesController);
usuariosRoutes.post("/roles", crearRolController);
usuariosRoutes.patch("/roles/:id", editarRolController);
usuariosRoutes.delete("/roles/:id", borrarRolController);

usuariosRoutes.get("/permisos", listPermisosController);
usuariosRoutes.patch("/permisos/:id", editarPermisoController);

usuariosRoutes.get("/", listUsuariosController);
usuariosRoutes.post("/", crearUsuarioController);
usuariosRoutes.get("/:id", getUsuarioController);
usuariosRoutes.patch("/:id", editarUsuarioController);
usuariosRoutes.put("/:id/password", restablecerPasswordController);
usuariosRoutes.patch("/:id/estado", cambiarEstadoUsuarioController);
