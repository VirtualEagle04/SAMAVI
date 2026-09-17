import type { Request, Response } from "express";
import { login } from "./auth.service.js";
import { parseLoginInput } from "./auth.schemas.js";

export async function loginController(request: Request, response: Response): Promise<void> {
  const input = parseLoginInput(request.body);
  const result = await login(input);
  response.status(200).json(result);
}