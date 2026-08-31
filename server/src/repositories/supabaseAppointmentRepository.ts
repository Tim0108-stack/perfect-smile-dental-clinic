import type { Appointment } from "@shared/types/index";
import { createSupabaseRequestClient } from "../lib/supabaseRequestClient.js";
import type { AppointmentInput, AppointmentRepository } from "./appointmentRepository.js";

/** Every column plus the treatment name, resolved via the real FK relationship. */
const APPOINTMENT_SELECT = "*, treatment:treatments(id, name)";

type AppointmentRow = Omit<Appointment, "treatment_name"> & {
  treatment: { id: number | string; name: string } | null;
};

function toAppointment(row: AppointmentRow): Appointment {
  const { treatment, ...rest } = row;
  return { ...rest, treatment_name: treatment?.name ?? null };
}

export function createAppointmentRepository(accessToken: string): AppointmentRepository {
  const client = createSupabaseRequestClient(accessToken);
  return {
    async findAll() {
      const { data, error } = await client.from("appointments").select(APPOINTMENT_SELECT).order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as AppointmentRow[]).map(toAppointment);
    },
    async findById(id) {
      const { data, error } = await client.from("appointments").select(APPOINTMENT_SELECT).eq("id", id).maybeSingle();
      if (error) throw error;
      return data ? toAppointment(data as AppointmentRow) : null;
    },
    async create(input: AppointmentInput) {
      const { data, error } = await client.from("appointments").insert([input]).select(APPOINTMENT_SELECT).single();
      if (error) throw error;
      return toAppointment(data as AppointmentRow);
    },
    async update(id, input) {
      const { data, error } = await client.from("appointments").update(input).eq("id", id).select(APPOINTMENT_SELECT).single();
      if (error) throw error;
      return toAppointment(data as AppointmentRow);
    },
    async remove(id) {
      const { error } = await client.from("appointments").delete().eq("id", id);
      if (error) throw error;
    },
    async updateStatus(id, status) {
      const { data, error } = await client.from("appointments").update({ status }).eq("id", id).select(APPOINTMENT_SELECT).single();
      if (error) throw error;
      return toAppointment(data as AppointmentRow);
    },
    async findTomorrowReminders(tomorrow, today) {
      const pendingResult = await client.from("appointments").select(APPOINTMENT_SELECT).eq("appointment_date", tomorrow).eq("status", "Scheduled").or("reminder_sent.is.null,reminder_sent.eq.false").order("assigned_slot", { ascending: true });
      if (pendingResult.error) throw pendingResult.error;
      const sentResult = await client.from("appointments").select(APPOINTMENT_SELECT).eq("reminder_sent", true).eq("reminder_sent_date", today).order("assigned_slot", { ascending: true });
      if (sentResult.error) throw sentResult.error;
      return {
        pending: ((pendingResult.data ?? []) as AppointmentRow[]).map(toAppointment),
        sent: ((sentResult.data ?? []) as AppointmentRow[]).map(toAppointment),
      };
    },
    async markReminder(id, reminderDate) {
      const { data, error } = await client.from("appointments").update({ reminder_sent: true, reminder_sent_date: reminderDate }).eq("id", id).select(APPOINTMENT_SELECT).single();
      if (error) throw error;
      return toAppointment(data as AppointmentRow);
    },
  };
}