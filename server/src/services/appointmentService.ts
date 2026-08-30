import type { Appointment, AppointmentStatus, BookingSource } from "@shared/types/index";
import type { AppointmentInput, AppointmentRepository } from "../repositories/appointmentRepository.js";
import { ApiError } from "../middleware/errorHandler.js";

export class AppointmentService {
  constructor(private readonly repository: AppointmentRepository) {}

  async list(): Promise<Appointment[]> {
    return this.repository.findAll();
  }

  async get(id: number | string): Promise<Appointment> {
    const appointment = await this.repository.findById(id);
    if (!appointment) throw new ApiError(404, "Appointment not found");
    return appointment;
  }

  async create(input: unknown): Promise<Appointment> {
    const record = validateAppointmentInput(input, false);
    await this.ensureSlotAvailable(record.appointment_date, record.assigned_slot);
    return this.repository.create(record);
  }

  async update(id: number | string, input: unknown): Promise<Appointment> {
    const record = validateAppointmentInput(input, true);
    if (record.appointment_date && record.assigned_slot) {
      await this.ensureSlotAvailable(record.appointment_date, record.assigned_slot, id);
    }
    return this.repository.update(id, record);
  }

  async remove(id: number | string): Promise<void> {
    await this.get(id);
    await this.repository.remove(id);
  }

  async updateStatus(id: number | string, status: unknown): Promise<Appointment> {
    if (!isAppointmentStatus(status)) throw new ApiError(400, "Invalid appointment status");
    await this.get(id);
    return this.repository.updateStatus(id, status);
  }

  async tomorrowReminders(): Promise<{ pending: Appointment[]; sent: Appointment[] }> {
    const tomorrow = localDateString(new Date(Date.now() + 86400000));
    return this.repository.findTomorrowReminders(tomorrow, localDateString());
  }

  async markReminder(id: number | string): Promise<Appointment> {
    await this.get(id);
    return this.repository.markReminder(id, localDateString());
  }

  private async ensureSlotAvailable(date: string, slot: string, excludedId?: number | string): Promise<void> {
    const appointments = await this.repository.findAll();
    const conflict = appointments.some((appointment) =>
      String(appointment.id) !== String(excludedId ?? "") &&
      appointment.appointment_date === date && appointment.assigned_slot === slot
    );
    if (conflict) throw new ApiError(409, "This slot is already booked. Please choose a different time.");
  }
}

const statuses: AppointmentStatus[] = ["Scheduled", "Checked in", "In treatment", "Completed", "Cancelled", "No-show"];
const sources: BookingSource[] = ["WhatsApp", "Phone Call", "Walk-in"];

function isAppointmentStatus(value: unknown): value is AppointmentStatus {
  return typeof value === "string" && statuses.includes(value as AppointmentStatus);
}

function validateAppointmentInput(value: unknown, partial: false): AppointmentInput;
function validateAppointmentInput(value: unknown, partial: true): Partial<AppointmentInput>;
function validateAppointmentInput(value: unknown, partial = false): AppointmentInput | Partial<AppointmentInput> {
  if (!value || typeof value !== "object") throw new ApiError(400, "Appointment payload is required");
  const data = value as Record<string, unknown>;
  const required = ["patient_name", "phone_number", "appointment_date", "assigned_slot", "booking_source"];
  if (!partial && required.some((field) => typeof data[field] !== "string" || !data[field])) {
    throw new ApiError(400, "Patient name, phone, date, slot, and booking source are required");
  }
  if (data.patient_name !== undefined && (typeof data.patient_name !== "string" || data.patient_name.trim().length > 50)) {
    throw new ApiError(400, "Patient name must be 50 characters or fewer");
  }
  if (data.phone_number !== undefined && (typeof data.phone_number !== "string" || !/^\d{10}$/.test(data.phone_number))) {
    throw new ApiError(400, "Phone number must contain exactly 10 digits");
  }
  if (data.appointment_date !== undefined && (typeof data.appointment_date !== "string" || data.appointment_date < localDateString())) {
    throw new ApiError(400, "Appointment date cannot be earlier than today");
  }
  if (data.notes !== undefined && data.notes !== null && (typeof data.notes !== "string" || data.notes.length > 500)) {
    throw new ApiError(400, "Notes must be 500 characters or fewer");
  }
  if (data.booking_source !== undefined && !sources.includes(data.booking_source as BookingSource)) {
    throw new ApiError(400, "Invalid booking source");
  }
  if (data.status !== undefined && !isAppointmentStatus(data.status)) {
    throw new ApiError(400, "Invalid appointment status");
  }
  return {
    ...(data.patient_name !== undefined && { patient_name: String(data.patient_name).trim() }),
    ...(data.phone_number !== undefined && { phone_number: String(data.phone_number) }),
    ...(data.appointment_date !== undefined && { appointment_date: String(data.appointment_date) }),
    ...(data.assigned_slot !== undefined && { assigned_slot: String(data.assigned_slot).trim() }),
    ...(!partial && { status: data.status === undefined ? "Scheduled" : data.status as AppointmentStatus }),
    ...(data.notes !== undefined && { notes: data.notes === null ? null : String(data.notes).trim() }),
    ...(data.booking_source !== undefined && { booking_source: data.booking_source as BookingSource }),
  } as AppointmentInput | Partial<AppointmentInput>;
}

function localDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}