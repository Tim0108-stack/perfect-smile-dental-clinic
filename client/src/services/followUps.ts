import type { FollowUp } from "@shared/types/index";
import { supabase } from "@/lib/supabaseClient";

export interface FollowUpPayload {
  appointment_id: string | number;
  patient_name: string;
  phone_number: string;
  follow_up_date: string;
  time_slot: string | null;
  notes: string | null;
  status?: FollowUp["status"];
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const response = await fetch(`/api${path}`, { ...options, headers: { "Content-Type": "application/json", ...(data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {}), ...options.headers } });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message || "Follow-up request failed");
  }
  return response.status === 204 ? (undefined as T) : response.json() as Promise<T>;
}

export const followUpApi = {
  list: () => request<FollowUp[]>("/follow-ups"),
  create: (payload: FollowUpPayload) => request<FollowUp>("/follow-ups", { method: "POST", body: JSON.stringify(payload) }),
  update: (id: FollowUp["id"], payload: Partial<FollowUpPayload>) => request<FollowUp>(`/follow-ups/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  complete: (id: FollowUp["id"]) => request<FollowUp>(`/follow-ups/${id}/complete`, { method: "PATCH" }),
  remove: (id: FollowUp["id"]) => request<void>(`/follow-ups/${id}`, { method: "DELETE" }),
};