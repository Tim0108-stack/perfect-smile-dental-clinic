import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { completeFollowUp, createFollowUp, deleteFollowUp, listFollowUps, updateFollowUp } from "../controllers/followUpController.js";

export const followUpsRouter = Router();
followUpsRouter.use(requireAuth);
followUpsRouter.get("/", listFollowUps);
followUpsRouter.post("/", createFollowUp);
followUpsRouter.patch("/:id", updateFollowUp);
followUpsRouter.patch("/:id/complete", completeFollowUp);
followUpsRouter.delete("/:id", deleteFollowUp);