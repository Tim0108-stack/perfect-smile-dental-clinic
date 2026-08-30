export interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = "Loading…" }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-slate-500">
      <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-teal-600 animate-spin" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}
