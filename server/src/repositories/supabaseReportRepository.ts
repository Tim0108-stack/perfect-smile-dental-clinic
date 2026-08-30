import type { ReportAppointment } from "@shared/types/index";
import { createSupabaseRequestClient } from "../lib/supabaseRequestClient.js";
import type { ReportRepository } from "./reportRepository.js";

export function createReportRepository(accessToken: string): ReportRepository {
  const client = createSupabaseRequestClient(accessToken);
  return {
    async findAppointmentsForReport(startDate, endDate) {
      let query = client.from("appointments").select("patient_name, phone_number, appointment_date, assigned_slot, status, booking_source").order("appointment_date", { ascending: false });
      if (startDate) query = query.gte("appointment_date", startDate);
      if (endDate) query = query.lte("appointment_date", endDate);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ReportAppointment[];
    },
  };
}