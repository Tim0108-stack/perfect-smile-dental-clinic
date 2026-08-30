import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "error" | "info";

const variantClasses: Record<ToastVariant, string> = {
  success: "border-teal-200 text-teal-800",
  error: "border-red-200 text-red-700",
  info: "border-slate-200 text-slate-700",
};

export interface ToastProps {
  variant?: ToastVariant;
  children: ReactNode;
}

export function Toast({ variant = "info", children }: ToastProps) {
  return (
    <div
      className={cn(
        "app-card pointer-events-auto rounded-xl px-4 py-3 text-sm font-medium shadow-pop max-w-sm",
        variantClasses[variant]
      )}
      role="status"
    >
      {children}
    </div>
  );
}
