import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { loginController, meController } from "./auth.controller.js";

export const authRoutes = Router();
authRoutes.post("/login", loginController);
authRoutes.get("/me", authenticate, meController);
