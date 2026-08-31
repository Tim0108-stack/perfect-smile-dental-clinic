import type { Treatment } from "@shared/types/index";
import type { TreatmentRepository } from "../repositories/treatmentRepository.js";

export class TreatmentService {
  constructor(private readonly repository: TreatmentRepository) {}

  /** The active treatment catalog, in display order. */
  list(): Promise<Treatment[]> {
    return this.repository.findActive();
  }
}
