import type { FollowUp, FollowUpStatus } from "@shared/types/index";
import type { FollowUpInput, FollowUpRepository } from "../repositories/followUpRepository.js";
import { ApiError } from "../middleware/errorHandler.js";

export class FollowUpService {
  constructor(private readonly repository: FollowUpRepository) {}

  list(): Promise<FollowUp[]> { return this.repository.findAll(); }

  async create(input: unknown): Promise<FollowUp> {
    const record = validateFollowUpInput(input, false) as FollowUpInput;
    await this.ensureSlotAvailable(record.follow_up_date, record.time_slot);
    return this.repository.create(record);
  }

  async update(id: number | string, input: unknown): Promise<FollowUp> {
    const record = validateFollowUpInput(input, true);
    if (record.follow_up_date && record.time_slot) await this.ensureSlotAvailable(record.follow_up_date, record.time_slot, id);
    return this.repository.update(id, record);
  }

  async complete(id: number | string): Promise<FollowUp> {
    await this.get(id);
    return this.repository.complete(id);
  }

  async remove(id: number | string): Promise<void> {
    await this.get(id);
    await this.repository.remove(id);
  }

  private async get(id: number | string): Promise<FollowUp> {
    const followUp = await this.repository.findById(id);
    if (!followUp) throw new ApiError(404, "Follow-up not found");
    return followUp;
  }

  private async ensureSlotAvailable(date: string, slot: string | null, excludedId?: number | string): Promise<void> {
    if (!slot) return;
    const followUps = await this.repository.findAll();
    const conflict = followUps.some((followUp) => String(followUp.id) !== String(excludedId ?? "") && followUp.status !== "Completed" && followUp.follow_up_date === date && followUp.time_slot === slot);
    if (conflict) throw new ApiError(409, "This follow-up slot is already booked. Please choose another time.");
  }
}

const statuses: FollowUpStatus[] = ["Open", "Completed"];
function validateFollowUpInput(value: unknown, partial: false): FollowUpInput;
function validateFollowUpInput(value: unknown, partial: true): Partial<FollowUpInput>;
function validateFollowUpInput(value: unknown, partial: boolean): FollowUpInput | Partial<FollowUpInput> {
  if (!value || typeof value !== "object") throw new ApiError(400, "Follow-up payload is required");
  const data = value as Record<string, unknown>;
  const required = ["appointment_id", "patient_name", "phone_number", "follow_up_date", "time_slot", "status"];
  if (!partial && required.some((field) => data[field] === undefined || data[field] === null || !String(data[field]).trim())) throw new ApiError(400, "Appointment, patient, phone, date, and status are required");
  if (data.phone_number !== undefined && (typeof data.phone_number !== "string" || !/^\d{10}$/.test(data.phone_number))) throw new ApiError(400, "Phone number must contain exactly 10 digits");
  if (data.follow_up_date !== undefined && (typeof data.follow_up_date !== "string" || data.follow_up_date < localDateString())) throw new ApiError(400, "Follow-up date cannot be earlier than today");
  if (data.notes !== undefined && data.notes !== null && (typeof data.notes !== "string" || data.notes.length > 500)) throw new ApiError(400, "Notes must be 500 characters or fewer");
  if (data.status !== undefined && !statuses.includes(data.status as FollowUpStatus)) throw new ApiError(400, "Invalid follow-up status");
  return {
    ...(data.appointment_id !== undefined && { appointment_id: data.appointment_id as string | number }),
    ...(data.patient_name !== undefined && { patient_name: String(data.patient_name).trim() }),
    ...(data.phone_number !== undefined && { phone_number: String(data.phone_number) }),
    ...(data.follow_up_date !== undefined && { follow_up_date: String(data.follow_up_date) }),
    ...(data.time_slot !== undefined && { time_slot: data.time_slot === null ? null : String(data.time_slot) }),
    ...(data.notes !== undefined && { notes: data.notes === null ? null : String(data.notes).trim() }),
    ...(!partial && { status: (data.status ?? "Open") as FollowUpStatus }),
  } as FollowUpInput | Partial<FollowUpInput>;
}

function localDateString(date = new Date()): string {
  const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, "0"); const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}