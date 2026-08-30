import type { ReactNode } from "react";

export type { HealthCheckResponse, WorkspaceSection } from "@shared/types/index";

/** A single primary navigation entry in the sidebar. */
export interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
}
