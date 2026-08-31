/**
 * AI Tool Implementations
 * Read-only tools for querying clinic data
 */

import { createSupabaseRequestClient } from "../lib/supabaseRequestClient.js";
import type {
  GetTodayAppointmentsParams,
  GetTomorrowAppointmentsParams,
  GetUpcomingAppointmentsParams,
  GetAppointmentSummaryParams,
  SearchPatientParams,
  GetPatientAppointmentsParams,
  GetPendingRemindersParams,
  AppointmentSummary,
  PatientSearchResult,
} from "./aiTypes.js";
import type { Appointment } from "@shared/types/index";

/** Every column plus the treatment name, resolved via the real FK relationship. */
const APPOINTMENT_SELECT = "*, treatment:treatments(name)";

type AppointmentRow = Omit<Appointment, "treatment_name"> & {
  treatment: { name: string } | null;
};

function toAppointment(row: AppointmentRow): Appointment {
  const { treatment, ...rest } = row;
  return { ...rest, treatment_name: treatment?.name ?? null };
}

export class AiTools {
  private supabase;

  constructor(accessToken: string) {
    this.supabase = createSupabaseRequestClient(accessToken);
  }

  /**
   * Get today's appointments
   */
  async getTodayAppointments(params: GetTodayAppointmentsParams): Promise<Appointment[]> {
    const today = new Date().toISOString().split("T")[0];
    const limit = params.limit ?? 20;

    const { data, error } = await this.supabase
      .from("appointments")
      .select(APPOINTMENT_SELECT)
      .eq("appointment_date", today)
      .order("assigned_slot", { ascending: true })
      .limit(limit);

    if (error) throw new Error(`Failed to get today's appointments: ${error.message}`);
    return ((data ?? []) as unknown as AppointmentRow[]).map(toAppointment);
  }

  /**
   * Get tomorrow's appointments
   */
  async getTomorrowAppointments(params: GetTomorrowAppointmentsParams): Promise<Appointment[]> {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
    const limit = params.limit ?? 20;

    const { data, error } = await this.supabase
      .from("appointments")
      .select(APPOINTMENT_SELECT)
      .eq("appointment_date", tomorrow)
      .order("assigned_slot", { ascending: true })
      .limit(limit);

    if (error) throw new Error(`Failed to get tomorrow's appointments: ${error.message}`);
    return ((data ?? []) as unknown as AppointmentRow[]).map(toAppointment);
  }

  /**
   * Get upcoming appointments within a date range
   */
  async getUpcomingAppointments(params: GetUpcomingAppointmentsParams): Promise<Appointment[]> {
    const today = new Date().toISOString().split("T")[0];
    const days = params.days ?? 7;
    const endDate = new Date(Date.now() + days * 86400000).toISOString().split("T")[0];
    const limit = params.limit ?? 50;

    const { data, error } = await this.supabase
      .from("appointments")
      .select(APPOINTMENT_SELECT)
      .gte("appointment_date", today)
      .lte("appointment_date", endDate)
      .in("status", ["Scheduled", "Checked in", "In treatment"])
      .order("appointment_date", { ascending: true })
      .order("assigned_slot", { ascending: true })
      .limit(limit);

    if (error) throw new Error(`Failed to get upcoming appointments: ${error.message}`);
    return ((data ?? []) as unknown as AppointmentRow[]).map(toAppointment);
  }

  /**
   * Get appointment summary statistics, broken down by status and by real
   * treatment. When `treatment` is supplied, it is resolved against the
   * actual treatments table (case-insensitive substring match) and the
   * summary is scoped to appointments with that treatment_id. A name that
   * matches zero or more than one treatment is reported as an error rather
   * than guessed.
   */
  async getAppointmentSummary(params: GetAppointmentSummaryParams): Promise<AppointmentSummary> {
    const { start_date, end_date, treatment } = params;

    let matchedTreatmentId: number | string | undefined;
    let matchedTreatmentName: string | undefined;

    if (treatment) {
      const { data: matches, error: treatmentError } = await this.supabase
        .from("treatments")
        .select("id, name")
        .ilike("name", `%${treatment}%`);

      if (treatmentError) throw new Error(`Failed to look up treatment: ${treatmentError.message}`);

      if (!matches || matches.length === 0) {
        throw new Error(`No treatment named "${treatment}" was found in the clinic's treatment catalog.`);
      }

      if (matches.length > 1) {
        const names = matches.map((match) => match.name).join(", ");
        throw new Error(`"${treatment}" matches more than one treatment (${names}). Please specify one exactly.`);
      }

      matchedTreatmentId = matches[0].id;
      matchedTreatmentName = matches[0].name;
    }

    let query = this.supabase
      .from("appointments")
      .select("status, treatment:treatments(name)")
      .gte("appointment_date", start_date)
      .lte("appointment_date", end_date);

    if (matchedTreatmentId !== undefined) {
      query = query.eq("treatment_id", matchedTreatmentId);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to get appointment summary: ${error.message}`);

    const appointments = (data ?? []) as unknown as Array<{ status: string; treatment: { name: string } | null }>;

    const summary: AppointmentSummary = {
      total: appointments.length,
      by_status: {},
      by_treatment: {},
    };

    for (const apt of appointments) {
      summary.by_status[apt.status] = (summary.by_status[apt.status] ?? 0) + 1;

      const treatmentName = apt.treatment?.name ?? "Not specified";
      summary.by_treatment![treatmentName] = (summary.by_treatment![treatmentName] ?? 0) + 1;
    }

    // Calculate derived metrics
    summary.cancellations = (summary.by_status["Cancelled"] ?? 0);
    summary.no_shows = (summary.by_status["No-show"] ?? 0);

    if (matchedTreatmentName) {
      summary.matched_treatment = matchedTreatmentName;
    }

    return summary;
  }

  /**
   * Search for patients by name or phone
   */
  async searchPatient(params: SearchPatientParams): Promise<PatientSearchResult[]> {
    const { query, limit = 10 } = params;
    const searchTerm = query.toLowerCase();

    // Search by patient name
    const { data: byName, error: nameError } = await this.supabase
      .from("appointments")
      .select("id, patient_name, phone_number")
      .ilike("patient_name", `%${searchTerm}%`)
      .limit(limit);

    if (nameError && nameError.code !== "PGRST116") {
      throw new Error(`Failed to search patients: ${nameError.message}`);
    }

    // Search by phone
    const { data: byPhone, error: phoneError } = await this.supabase
      .from("appointments")
      .select("id, patient_name, phone_number")
      .ilike("phone_number", `%${searchTerm}%`)
      .limit(limit);

    if (phoneError && phoneError.code !== "PGRST116") {
      throw new Error(`Failed to search patients: ${phoneError.message}`);
    }

    const results = new Map<string, PatientSearchResult>();

    // Process results and deduplicate
    const allResults = [...(byName ?? []), ...(byPhone ?? [])];
    for (const apt of allResults) {
      const key = apt.patient_name.toLowerCase();
      if (!results.has(key)) {
        results.set(key, {
          id: apt.id,
          name: apt.patient_name,
          phone: apt.phone_number,
          upcoming_appointments: 0,
        });
      }
    }

    // Count upcoming appointments for each patient
    for (const [, patient] of results) {
      const { count, error } = await this.supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("patient_name", patient.name)
        .gte("appointment_date", new Date().toISOString().split("T")[0])
        .in("status", ["Scheduled", "Checked in"]);

      if (!error) {
        patient.upcoming_appointments = count ?? 0;
      }
    }

    return Array.from(results.values()).slice(0, limit);
  }

  /**
   * Get appointment history for a patient
   */
  async getPatientAppointments(params: GetPatientAppointmentsParams): Promise<Appointment[]> {
    const { patient_name, limit = 15 } = params;

    const { data, error } = await this.supabase
      .from("appointments")
      .select(APPOINTMENT_SELECT)
      .eq("patient_name", patient_name)
      .order("appointment_date", { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to get patient appointments: ${error.message}`);
    return ((data ?? []) as unknown as AppointmentRow[]).map(toAppointment);
  }

  /**
   * Get appointments with pending reminders
   */
  async getPendingReminders(params: GetPendingRemindersParams): Promise<Appointment[]> {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
    const limit = params.limit ?? 20;

    const { data, error } = await this.supabase
      .from("appointments")
      .select(APPOINTMENT_SELECT)
      .eq("appointment_date", tomorrow)
      .eq("status", "Scheduled")
      .or("reminder_sent.is.null,reminder_sent.eq.false")
      .order("assigned_slot", { ascending: true })
      .limit(limit);

    if (error) throw new Error(`Failed to get pending reminders: ${error.message}`);
    return ((data ?? []) as unknown as AppointmentRow[]).map(toAppointment);
  }
}
