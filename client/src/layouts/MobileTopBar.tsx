import { BrandMark } from "@/components/BrandMark";

interface MobileTopBarProps {
  onOpenMenu: () => void;
}

export function MobileTopBar({ onOpenMenu }: MobileTopBarProps) {
  return (
    <div className="lg:hidden sticky top-0 z-40 flex items-center gap-3 h-14 px-4 bg-white/90 backdrop-blur border-b border-slate-100">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open menu"
        className="w-9 h-9 -ml-1.5 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100"
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
      </button>
      <div className="flex items-center gap-2">
        <BrandMark size={28} />
        <span className="text-sm font-bold text-slate-900 font-display">Perfect Smile</span>
      </div>
    </div>
  );
}
