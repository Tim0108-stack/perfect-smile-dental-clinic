import type { ReportAppointment } from "@shared/types/index";

/** Read-only source contract for future report aggregation. */
export interface ReportRepository {
  findAppointmentsForReport(startDate?: string, endDate?: string): Promise<ReportAppointment[]>;
}