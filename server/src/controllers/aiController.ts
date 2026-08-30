import type { NextFunction, Request, Response } from "express";
import { ClinicAiAgent } from "../services/aiAgent.js";
import type { AiRequest } from "../services/aiTypes.js";

function getAgent(req: Request): ClinicAiAgent {
  const token = req.header("authorization")?.slice(7);
  if (!token) throw new Error("Authentication token is missing");
  return new ClinicAiAgent(token);
}

export async function chatWithAi(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const request = req.body as AiRequest;
    const response = await getAgent(req).chat(request);
    res.json(response);
  } catch (error) {
    next(error);
  }
}
