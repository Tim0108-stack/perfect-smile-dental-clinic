import type { Treatment } from "@shared/types/index";

/** Data-access contract for the existing treatments table. */
export interface TreatmentRepository {
  findActive(): Promise<Treatment[]>;
}
