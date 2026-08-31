import type { Treatment } from "@shared/types/index";
import { supabase } from "@/lib/supabaseClient";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message || "Treatment request failed");
  }
  return response.status === 204 ? (undefined as T) : response.json() as Promise<T>;
}

export const treatmentApi = {
  list: () => request<Treatment[]>("/treatments"),
};
