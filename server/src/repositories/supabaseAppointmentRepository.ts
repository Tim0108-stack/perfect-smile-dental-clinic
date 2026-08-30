import type { Appointment } from "@shared/types/index";
import { createSupabaseRequestClient } from "../lib/supabaseRequestClient.js";
import type { AppointmentInput, AppointmentRepository } from "./appointmentRepository.js";

export function createAppointmentRepository(accessToken: string): AppointmentRepository {
  const client = createSupabaseRequestClient(accessToken);
  return {
    async findAll() {
      const { data, error } = await client.from("appointments").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Appointment[];
    },
    async findById(id) {
      const { data, error } = await client.from("appointments").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return (data as Appointment | null) ?? null;
    },
    async create(input: AppointmentInput) {
      const { data, error } = await client.from("appointments").insert([input]).select().single();
      if (error) throw error;
      return data as Appointment;
    },
    async update(id, input) {
      const { data, error } = await client.from("appointments").update(input).eq("id", id).select().single();
      if (error) throw error;
      return data as Appointment;
    },
    async remove(id) {
      const { error } = await client.from("appointments").delete().eq("id", id);
      if (error) throw error;
    },
    async updateStatus(id, status) {
      const { data, error } = await client.from("appointments").update({ status }).eq("id", id).select().single();
      if (error) throw error;
      return data as Appointment;
    },
    async findTomorrowReminders(tomorrow, today) {
      const pendingResult = await client.from("appointments").select("*").eq("appointment_date", tomorrow).eq("status", "Scheduled").or("reminder_sent.is.null,reminder_sent.eq.false").order("assigned_slot", { ascending: true });
      if (pendingResult.error) throw pendingResult.error;
      const sentResult = await client.from("appointments").select("*").eq("reminder_sent", true).eq("reminder_sent_date", today).order("assigned_slot", { ascending: true });
      if (sentResult.error) throw sentResult.error;
      return { pending: (pendingResult.data ?? []) as Appointment[], sent: (sentResult.data ?? []) as Appointment[] };
    },
    async markReminder(id, reminderDate) {
      const { data, error } = await client.from("appointments").update({ reminder_sent: true, reminder_sent_date: reminderDate }).eq("id", id).select().single();
      if (error) throw error;
      return data as Appointment;
    },
  };
}