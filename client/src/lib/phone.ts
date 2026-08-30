export function normalizePhoneNumber(phone: string): string {
  return phone.replace(/\D/g, "");
}