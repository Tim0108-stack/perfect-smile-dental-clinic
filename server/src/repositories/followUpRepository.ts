import type { FollowUp } from "@shared/types/index";

/** Data-access contract for the existing follow_ups table. */
export interface FollowUpRepository {
  findAll(): Promise<FollowUp[]>;
  findById(id: number | string): Promise<FollowUp | null>;
  create(input: FollowUpInput): Promise<FollowUp>;
  update(id: number | string, input: Partial<FollowUpInput>): Promise<FollowUp>;
  remove(id: number | string): Promise<void>;
  complete(id: number | string): Promise<FollowUp>;
}

export type FollowUpInput = Omit<FollowUp, "id">;