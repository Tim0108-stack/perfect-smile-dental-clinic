import type { NextFunction, Request, Response } from "express";
import { createTreatmentRepository } from "../repositories/supabaseTreatmentRepository.js";
import { TreatmentService } from "../services/treatmentService.js";

function serviceFor(req: Request): TreatmentService {
  const token = req.header("authorization")?.slice(7);
  if (!token) throw new Error("Authentication token is missing");
  return new TreatmentService(createTreatmentRepository(token));
}

export async function listTreatments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { res.json(await serviceFor(req).list()); } catch (error) { next(error); }
}
