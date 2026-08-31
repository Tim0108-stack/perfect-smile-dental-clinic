import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { listTreatments } from "../controllers/treatmentController.js";

export const treatmentsRouter = Router();
treatmentsRouter.use(requireAuth);
treatmentsRouter.get("/", listTreatments);
