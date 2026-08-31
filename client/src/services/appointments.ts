import type {
  Appointment,
  AppointmentStatus,
  ReportAppointment,
} from "@shared/types/index";

import { supabase } from "@/lib/supabaseClient";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export interface AppointmentPayload {
  patient_name: string;
  phone_number: string;
  appointment_date: string;
  assigned_slot: string;
  notes: string | null;
  booking_source: Appointment["booking_source"];
  status?: AppointmentStatus;
  treatment_id: Appointment["treatment_id"];
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  /*
   * Always retrieve the current Supabase session before making
   * an authenticated API request.
   *
   * getSession() returns the locally stored session. If Supabase
   * has an expired access token, refreshSession() gives us a
   * current token before sending the request.
   */
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(
      error.message || "Unable to retrieve authentication session",
    );
  }

  let session = data.session;

  if (!session) {
    throw new Error(
      "Your session has expired. Please sign in again.",
    );
  }

  /*
   * Refresh the session when necessary.
   * Supabase handles whether the refresh is actually required.
   */
  const refreshed = await supabase.auth.refreshSession();

  if (!refreshed.error && refreshed.data.session) {
    session = refreshed.data.session;
  }

  const token = session.access_token;

  const headers = new Headers(options.headers);

  headers.set("Content-Type", "application/json");
  headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`/api${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = (await response
      .json()
      .catch(() => null)) as
      | {
          error?: {
            message?: string;
          };
        }
      | null;

    if (response.status === 401) {
      throw new Error(
        body?.error?.message ||
          "Your session is no longer valid. Please sign in again.",
      );
    }

    throw new Error(
      body?.error?.message ||
        `Appointment request failed (${response.status})`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const appointmentApi = {
  list: () =>
    request<Appointment[]>("/appointments"),

  get: (id: Appointment["id"]) =>
    request<Appointment>(`/appointments/${id}`),

  create: (payload: AppointmentPayload) =>
    request<Appointment>("/appointments", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  update: (
    id: Appointment["id"],
    payload: AppointmentPayload,
  ) =>
    request<Appointment>(`/appointments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  remove: (id: Appointment["id"]) =>
    request<void>(`/appointments/${id}`, {
      method: "DELETE",
    }),

  updateStatus: (
    id: Appointment["id"],
    status: AppointmentStatus,
  ) =>
    request<Appointment>(
      `/appointments/${id}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
      },
    ),

  tomorrowReminders: () =>
    request<{
      pending: Appointment[];
      sent: Appointment[];
    }>("/appointments/reminders/tomorrow"),

  markReminder: (id: Appointment["id"]) =>
    request<Appointment>(
      `/appointments/${id}/reminder`,
      {
        method: "PATCH",
      },
    ),

  report: (start?: string, end?: string) => {
    const query =
      start || end
        ? `?${new URLSearchParams({
            ...(start ? { start } : {}),
            ...(end ? { end } : {}),
          })}`
        : "";

    return request<ReportAppointment[]>(
      `/reports${query}`,
    );
  },
};

/**
 * Opens the tomorrow-reminder WhatsApp message for an appointment and
 * marks it as reminded on success. This is the single shared
 * implementation used by both the Dashboard reminders queue and the
 * Calendar appointment detail view, so "a reminder was sent" is
 * recorded consistently no matter where staff trigger it from.
 */
export async function sendTomorrowReminder(
  appointment: Appointment,
): Promise<Appointment> {
  const date = new Date(
    `${appointment.appointment_date}T00:00:00`,
  ).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const message = `Hello ${appointment.patient_name},

This is a friendly reminder from *Perfect Smile Dental Clinic*.

You have an appointment tomorrow:
*Date:* ${date}
*Time:* ${appointment.assigned_slot}

Please arrive *10 minutes early*.

To reschedule, please call us as soon as possible.

Thank you,
Perfect Smile Dental Clinic`;

  const windowHandle = window.open(
    buildWhatsAppUrl(appointment.phone_number, message),
    "_blank",
  );

  if (!windowHandle) {
    throw new Error(
      "WhatsApp could not be opened. Please allow pop-ups and try again.",
    );
  }

  windowHandle.opener = null;

  return appointmentApi.markReminder(appointment.id);
}
