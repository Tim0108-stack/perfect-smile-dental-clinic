import type { Request, Response } from "express";
import type { HealthCheckResponse } from "../../../shared/types/index.js";

export function getHealth(_req: Request, res: Response<HealthCheckResponse>): void {
  res.status(200).json({
    status: "ok",
    service: "perfect-smile-api",
    timestamp: new Date().toISOString(),
  });
}
