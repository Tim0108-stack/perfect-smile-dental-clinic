import type { ReportAppointment } from "@shared/types/index";
import type { ReportRepository } from "../repositories/reportRepository.js";

export class ReportService {
  constructor(private readonly repository: ReportRepository) {}

  list(startDate?: string, endDate?: string): Promise<ReportAppointment[]> {
    return this.repository.findAppointmentsForReport(startDate, endDate);
  }
}