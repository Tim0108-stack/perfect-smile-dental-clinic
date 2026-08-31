import type { Treatment } from "@shared/types/index";
import { createSupabaseRequestClient } from "../lib/supabaseRequestClient.js";
import type { TreatmentRepository } from "./treatmentRepository.js";

export function createTreatmentRepository(accessToken: string): TreatmentRepository {
  const client = createSupabaseRequestClient(accessToken);
  return {
    async findActive() {
      const { data, error } = await client
        .from("treatments")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Treatment[];
    },
  };
}
