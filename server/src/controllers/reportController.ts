import type { NextFunction, Request, Response } from "express";
import { createReportRepository } from "../repositories/supabaseReportRepository.js";
import { ReportService } from "../services/reportService.js";

function isDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function listReportAppointments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const startDate = req.query.start;
    const endDate = req.query.end;
    if ((startDate !== undefined && !isDate(startDate)) || (endDate !== undefined && !isDate(endDate))) {
      res.status(400).json({ error: { message: "Report dates must use YYYY-MM-DD format", status: 400 } });
      return;
    }
    const token = req.header("authorization")?.slice(7);
    if (!token) throw new Error("Authentication token is missing");
    res.json(await new ReportService(createReportRepository(token)).list(startDate, endDate));
  } catch (error) { next(error); }
}