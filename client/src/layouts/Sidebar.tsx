import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { BrandMark } from "@/components/BrandMark";
import { cn } from "@/lib/utils";
import { useAuth } from "@/auth/AuthProvider";
import { useToast } from "@/hooks/useToast";
import { localDateString } from "@/lib/date";
import { followUpApi } from "@/services/followUps";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const navItems = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    ),
  },
  {
    label: "Follow-ups",
    path: "/follow-ups",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 1 1-3-6.7" />
        <path d="M21 3v6h-6" />
      </svg>
    ),
  },
  {
    label: "Calendar",
    path: "/calendar",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    label: "Reports",
    path: "/reports",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
];

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user, signOut } = useAuth();
  const { showToast } = useToast();
  const [overdueFollowUps, setOverdueFollowUps] = useState(0);
  const displayName = user?.email?.split("@")[0].replace(/[._-]+/g, " ") || "Clinic Staff";
  const initials = displayName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  useEffect(() => {
    followUpApi.list().then((items) => {
      setOverdueFollowUps(items.filter((item) => item.status !== "Completed" && item.follow_up_date < localDateString()).length);
    }).catch(() => setOverdueFollowUps(0));
  }, []);

  async function handleSignOut() {
    const { error } = await signOut();
    if (error) showToast("Unable to log out. Please try again.", "error");
  }

  return (
    <>
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-[55] bg-slate-950/40 lg:hidden transition-opacity",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-[60] flex flex-col w-[17rem] bg-[#fcfcfd] border-r border-[#f0f0f2] transition-transform duration-200 ease-out",
          "lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-slate-100 shrink-0">
          <BrandMark size={32} />
          <div className="leading-tight">
            <p className="text-[13px] font-bold text-slate-900 font-display tracking-tight">
              Perfect Smile
            </p>
            <p className="text-[10.5px] text-slate-400 font-medium -mt-0.5">
              Clinic workspace
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="ml-auto lg:hidden w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-400"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          <p className="px-2.5 mb-1.5 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
            Workspace
          </p>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) => cn("sidenav-item", isActive && "active")}
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {item.path === "/follow-ups" && overdueFollowUps > 0 && <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold leading-none">{overdueFollowUps}</span>}
            </NavLink>
          ))}

          <p className="px-2.5 mb-1.5 mt-5 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
            Quick action
          </p>
          <NavLink
            to="/appointments/new"
            onClick={onClose}
            className={({ isActive }) => cn("sidenav-item", isActive && "active")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New appointment
          </NavLink>
        </nav>

        <div className="border-t border-slate-100 p-3 shrink-0">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors">
            <div className="w-8 h-8 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="leading-tight min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-slate-800 truncate capitalize">{displayName}</p>
              <p className="text-[11px] text-slate-400">Administrator</p>
            </div>
          </div>
          <button type="button" onClick={handleSignOut} className="mt-2 w-full text-left px-2 py-1 text-xs font-semibold text-slate-500 hover:text-red-600">
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
