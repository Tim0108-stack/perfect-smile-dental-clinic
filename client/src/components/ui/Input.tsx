import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "field-control w-full rounded-lg border px-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
