import type { FollowUp } from "@shared/types/index";
import { createSupabaseRequestClient } from "../lib/supabaseRequestClient.js";
import type { FollowUpInput, FollowUpRepository } from "./followUpRepository.js";

export function createFollowUpRepository(accessToken: string): FollowUpRepository {
  const client = createSupabaseRequestClient(accessToken);
  return {
    async findAll() { const { data, error } = await client.from("follow_ups").select("*").order("follow_up_date", { ascending: true }); if (error) throw error; return (data ?? []) as FollowUp[]; },
    async findById(id) { const { data, error } = await client.from("follow_ups").select("*").eq("id", id).maybeSingle(); if (error) throw error; return (data as FollowUp | null) ?? null; },
    async create(input: FollowUpInput) { const { data, error } = await client.from("follow_ups").insert([input]).select().single(); if (error) throw error; return data as FollowUp; },
    async update(id, input) { const { data, error } = await client.from("follow_ups").update(input).eq("id", id).select().single(); if (error) throw error; return data as FollowUp; },
    async remove(id) { const { error } = await client.from("follow_ups").delete().eq("id", id); if (error) throw error; },
    async complete(id) { const { data, error } = await client.from("follow_ups").update({ status: "Completed" }).eq("id", id).select().single(); if (error) throw error; return data as FollowUp; },
  };
}