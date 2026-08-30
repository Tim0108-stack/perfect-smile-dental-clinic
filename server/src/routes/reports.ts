import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { listReportAppointments } from "../controllers/reportController.js";

export const reportsRouter = Router();
reportsRouter.use(requireAuth);
reportsRouter.get("/", listReportAppointments);