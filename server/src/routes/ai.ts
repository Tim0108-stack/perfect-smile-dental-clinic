import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { chatWithAi } from "../controllers/aiController.js";

export const aiRouter = Router();
aiRouter.use(requireAuth);
aiRouter.post("/chat", chatWithAi);
