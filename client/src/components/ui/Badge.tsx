import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "teal" | "amber" | "rose" | "slate" | "blue";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  teal: "bg-teal-50 border-teal-200 text-teal-700",
  amber: "bg-amber-50 border-amber-200 text-amber-700",
  rose: "bg-rose-50 border-rose-200 text-rose-700",
  slate: "bg-slate-100 border-slate-200 text-slate-600",
  blue: "bg-blue-50 border-blue-200 text-blue-700",
};

export function Badge({ className, variant = "slate", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-semibold uppercase tracking-wide",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
