import { normalizePhoneNumber } from "@/lib/phone";

export function buildWhatsAppUrl(phone: string, message: string, countryCode = "91"): string {
  const digits = normalizePhoneNumber(phone);
  return `https://wa.me/${countryCode}${digits}?text=${encodeURIComponent(message)}`;
}