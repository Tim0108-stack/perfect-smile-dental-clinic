import type { AppointmentStatus, BookingSource } from "@shared/types/index";
import { localDateString } from "@/lib/date";

export const APPOINTMENT_SLOTS = [
  "08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM",
  "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM",
  "05:00 PM", "05:30 PM", "06:00 PM",
] as const;

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "Scheduled", "Checked in", "In treatment", "Completed", "Cancelled", "No-show",
];

export const BOOKING_SOURCES: BookingSource[] = ["WhatsApp", "Phone Call", "Walk-in"];

export const sourceStyles: Record<BookingSource, string> = {
  WhatsApp: "bg-green-50 text-green-700 border-green-200",
  "Phone Call": "bg-blue-50 text-blue-700 border-blue-200",
  "Walk-in": "bg-amber-50 text-amber-700 border-amber-200",
};

/**
 * Statuses that represent an appointment still on the books (not yet
 * resolved). "Checked in" and "In treatment" are included for forward
 * compatibility with a future front-desk check-in workflow, but no
 * current UI path produces them.
 */
export const CONFIRMED_STATUSES: AppointmentStatus[] = [
  "Scheduled", "Checked in", "In treatment",
];

/** Statuses that represent an appointment that has been resolved. */
export const TERMINAL_STATUSES: AppointmentStatus[] = [
  "Completed", "Cancelled", "No-show",
];

export function isConfirmedStatus(status: AppointmentStatus): boolean {
  return CONFIRMED_STATUSES.includes(status);
}

export function isTerminalStatus(status: AppointmentStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/** Single source of truth for how a status is labeled in the UI. */
export function displayStatusLabel(status: AppointmentStatus): string {
  if (status === "Completed") return "Completed";
  if (status === "Cancelled") return "Cancelled";
  if (status === "No-show") return "No-show";
  return "Confirmed";
}

export function parseSlotMinutes(slot: string | null | undefined): number | null {
  if (!slot) return null;
  const match = slot.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hours = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "PM") hours += 12;
  return hours * 60 + Number(match[2]);
}

interface OverdueCheckable {
  appointment_date: string;
  assigned_slot: string;
  status: AppointmentStatus;
}

/**
 * True when a still-confirmed appointment's scheduled slot on today's
 * date has already passed. Used to flag appointments that likely need
 * front-desk attention (forgotten check-out) without changing their
 * underlying status.
 */
export function isOverdueToday(
  appointment: OverdueCheckable,
  now: Date = new Date(),
): boolean {
  if (!isConfirmedStatus(appointment.status)) return false;
  if (appointment.appointment_date !== localDateString(now)) return false;

  const minutes = parseSlotMinutes(appointment.assigned_slot);
  if (minutes === null) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return minutes < currentMinutes;
}

export interface AppointmentStatusCounts {
  total: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  noShow: number;
  /** Cancelled + No-show combined — "appointments that did not happen". */
  cancelledOrNoShow: number;
}

/**
 * Shared status-tally logic used by Dashboard, Calendar, and Reports so
 * the definition of "confirmed" / "completed" / "cancelled or no-show"
 * can't silently drift apart between pages.
 */
export function computeStatusCounts<T extends { status: AppointmentStatus }>(
  items: readonly T[],
): AppointmentStatusCounts {
  const counts: AppointmentStatusCounts = {
    total: items.length,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    noShow: 0,
    cancelledOrNoShow: 0,
  };

  for (const item of items) {
    if (item.status === "Completed") {
      counts.completed += 1;
    } else if (item.status === "Cancelled") {
      counts.cancelled += 1;
      counts.cancelledOrNoShow += 1;
    } else if (item.status === "No-show") {
      counts.noShow += 1;
      counts.cancelledOrNoShow += 1;
    } else if (isConfirmedStatus(item.status)) {
      counts.confirmed += 1;
    }
  }

  return counts;
}

interface FocusCandidate {
  appointment_date: string;
  assigned_slot: string;
  status: AppointmentStatus;
}

/**
 * Selects which of today's confirmed appointments should be the focused
 * "next" appointment: an overdue-but-unresolved appointment always
 * preempts a later one (it needs attention first), otherwise the
 * earliest not-yet-passed confirmed appointment wins. Purely derived
 * from the current appointment list, so it naturally advances whenever
 * the focused appointment's status changes.
 */
export function selectFocusAppointment<T extends FocusCandidate>(
  appointments: readonly T[],
  now: Date = new Date(),
): T | undefined {
  const today = localDateString(now);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const candidates = appointments
    .filter(
      (appointment) =>
        appointment.appointment_date === today &&
        isConfirmedStatus(appointment.status),
    )
    .map((appointment) => ({
      appointment,
      minutes: parseSlotMinutes(appointment.assigned_slot),
    }))
    .filter(
      (item): item is { appointment: T; minutes: number } =>
        item.minutes !== null,
    )
    .sort((a, b) => a.minutes - b.minutes);

  const overdue = candidates.filter(
    (item) => item.minutes < currentMinutes,
  );

  const upcoming = candidates.filter(
    (item) => item.minutes >= currentMinutes,
  );

  return (overdue[0] ?? upcoming[0])?.appointment;
}

export function getInitials(name: string): string {
  return name.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export function formatPatientName(name: string): string {
  return name.trim().replace(/\b\w/g, (character) => character.toUpperCase());
}
