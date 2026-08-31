import type { Appointment } from "@shared/types/index";

/** Data-access contract for the existing appointments table. */
export interface AppointmentRepository {
  findAll(): Promise<Appointment[]>;
  findById(id: number | string): Promise<Appointment | null>;
  create(input: AppointmentInput): Promise<Appointment>;
  update(id: number | string, input: Partial<AppointmentInput>): Promise<Appointment>;
  remove(id: number | string): Promise<void>;
  updateStatus(id: number | string, status: Appointment["status"]): Promise<Appointment>;
  findTomorrowReminders(tomorrow: string, today: string): Promise<{ pending: Appointment[]; sent: Appointment[] }>;
  markReminder(id: number | string, reminderDate: string): Promise<Appointment>;
}

export type AppointmentInput = Omit<Appointment, "id" | "created_at" | "reminder_sent" | "reminder_sent_date" | "treatment_name">;