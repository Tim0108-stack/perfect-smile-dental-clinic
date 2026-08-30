import type { AppointmentStatus, BookingSource } from "@shared/types/index";

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

export function parseSlotMinutes(slot: string | null | undefined): number | null {
  if (!slot) return null;
  const match = slot.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hours = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "PM") hours += 12;
  return hours * 60 + Number(match[2]);
}

export function getInitials(name: string): string {
  return name.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export function formatPatientName(name: string): string {
  return name.trim().replace(/\b\w/g, (character) => character.toUpperCase());
}