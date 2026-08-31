/** Shared domain contracts for the existing Perfect Smile database. */

/** Shape of the response returned by GET /api/health */
export interface HealthCheckResponse {
  status: "ok";
  service: "perfect-smile-api";
  timestamp: string;
}

/** Generic API error envelope returned by the error-handling middleware. */
export interface ApiErrorResponse {
  error: {
    message: string;
    status: number;
  };
}

export type AppointmentStatus =
  | "Scheduled"
  | "Checked in"
  | "In treatment"
  | "Completed"
  | "Cancelled"
  | "No-show";

export type BookingSource = "WhatsApp" | "Phone Call" | "Walk-in";

export interface Appointment {
  id: number | string;
  patient_name: string;
  phone_number: string;
  appointment_date: string;
  assigned_slot: string;
  status: AppointmentStatus;
  notes: string | null;
  booking_source: BookingSource;
  created_at?: string;
  reminder_sent?: boolean | null;
  reminder_sent_date?: string | null;
  /** Real FK into `treatments.id`, or null when no treatment is set. */
  treatment_id: number | string | null;
  /** Read-only: the treatment's name, resolved server-side from `treatments`. */
  treatment_name?: string | null;
}

/** A treatment the clinic offers. Stored, not hard-coded — new rows can be
 *  added to the `treatments` table at any time without a code change. */
export interface Treatment {
  id: number | string;
  name: string;
  is_active: boolean;
  display_order: number;
  created_at?: string;
}

export type FollowUpStatus = "Open" | "Completed";

export interface FollowUp {
  id: number | string;
  appointment_id: number | string;
  patient_name: string;
  phone_number: string;
  follow_up_date: string;
  time_slot: string | null;
  notes: string | null;
  status: FollowUpStatus;
}

export interface Reminder {
  appointment: Appointment;
  kind: "tomorrow";
  sent: boolean;
}

export type ReportPeriod = "all" | "week" | "month" | "year";

export interface ReportSummary {
  period: ReportPeriod;
  total: number;
  completed: number;
  cancelled: number;
  scheduled: number;
  completionRate: number;
}

export interface ReportAppointment {
  patient_name: string;
  phone_number: string;
  appointment_date: string;
  assigned_slot: string;
  status: AppointmentStatus;
  booking_source: BookingSource;
  treatment_name: string | null;
}

/** Primary workspace navigation sections in the clinic app shell. */
export type WorkspaceSection =
  | "dashboard"
  | "follow-ups"
  | "calendar"
  | "reports"
  | "new-appointment";
