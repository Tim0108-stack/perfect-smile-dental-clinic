import type { HealthCheckResponse } from "@/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

/** Calls the Express foundation's GET /api/health endpoint. */
export async function fetchHealth(): Promise<HealthCheckResponse> {
  const response = await fetch(`${API_BASE_URL}/health`);
  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }
  return response.json() as Promise<HealthCheckResponse>;
}
