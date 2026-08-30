/**
 * AI Agent Types and Contracts
 * Defines tool parameters, responses, and agent message structures
 */

export interface AiMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AiToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface AiToolResult {
  type: "tool";
  tool_use_id: string;
  content: string;
}

export interface AiRequest {
  messages: AiMessage[];
}

export interface AiResponse {
  type: "text" | "error" | "configuration_error";
  content: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

// ─────────────────────────────────────────────────────────────
// Tool Parameter Types
// ─────────────────────────────────────────────────────────────

export interface GetTodayAppointmentsParams {
  limit?: number;
}

export interface GetTomorrowAppointmentsParams {
  limit?: number;
}

export interface GetUpcomingAppointmentsParams {
  days?: number;
  limit?: number;
}

export interface GetAppointmentSummaryParams {
  start_date: string;
  end_date: string;
  appointment_type?: string;
}

export interface SearchPatientParams {
  query: string;
  limit?: number;
}

export interface GetPatientAppointmentsParams {
  patient_name: string;
  limit?: number;
}

export interface GetPendingRemindersParams {
  limit?: number;
}

export interface GetScheduleConflictsParams {
  date?: string;
}

// ─────────────────────────────────────────────────────────────
// Tool Result Types
// ─────────────────────────────────────────────────────────────

export interface AppointmentSummary {
  total: number;
  by_status: Record<string, number>;
  by_type?: Record<string, number>;
  consultations?: number;
  follow_ups?: number;
  cancellations?: number;
  no_shows?: number;
}

export interface PatientSearchResult {
  id: string | number;
  name: string;
  phone: string;
  upcoming_appointments: number;
}

export interface ScheduleConflict {
  date: string;
  time_slot: string;
  appointments: Array<{
    id: string | number;
    patient_name: string;
  }>;
}
