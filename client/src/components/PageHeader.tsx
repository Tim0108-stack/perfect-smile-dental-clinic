import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <section className="dashboard-hero rounded-2xl p-5 sm:p-7 mb-6 fade-in">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-teal-700 mb-2">
            {eyebrow}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 tracking-tight">
            {title}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{description}</p>
        </div>
        {action && <div className="flex flex-wrap gap-2">{action}</div>}
      </div>
    </section>
  );
}
