import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { useToast } from "@/hooks/useToast";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function LoginPage() {
  const { session, signIn } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();

    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) return;

    setSubmitting(true);

    const { error } = await signIn(email.trim(), password);

    setSubmitting(false);

    if (error) {
      showToast(
        error.message || "Unable to sign in. Please check your details.",
        "error",
      );
      return;
    }

    const from = (
      location.state as { from?: { pathname?: string } } | null
    )?.from?.pathname;

    navigate(from || "/dashboard", { replace: true });
  }

  return (
    <main className="min-h-screen bg-[#f7f9f8] text-slate-900 selection:bg-teal-100">
      <div className="min-h-screen lg:grid lg:grid-cols-[1.08fr_0.92fr]">
        {/* ============================================================
            LEFT — BRAND / CLINIC EXPERIENCE
        ============================================================ */}
        <section className="relative hidden overflow-hidden lg:flex">
          {/* Background */}
          <div className="absolute inset-0 bg-[#e9f7f4]" />

          {/* Decorative gradients */}
          <div className="absolute -left-32 -top-32 h-[32rem] w-[32rem] rounded-full bg-teal-200/30 blur-3xl" />
          <div className="absolute -bottom-40 -right-32 h-[34rem] w-[34rem] rounded-full bg-cyan-100/40 blur-3xl" />

          {/* Fine grid */}
          <div
            className="absolute inset-0 opacity-[0.18]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(15,118,110,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(15,118,110,0.08) 1px, transparent 1px)",
              backgroundSize: "42px 42px",
            }}
          />

          <div className="relative z-10 flex min-h-screen w-full flex-col justify-between px-12 py-10 xl:px-16">
            {/* Brand */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 shadow-lg shadow-slate-900/10">
                  <svg
                    viewBox="0 0 32 32"
                    className="h-6 w-6 text-white"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M16 27.5S5.5 21.1 5.5 12.8C5.5 8.8 8.2 6 11.8 6c2.1 0 3.4 1 4.2 2.4C16.8 7 18.1 6 20.2 6c3.6 0 6.3 2.8 6.3 6.8C26.5 21.1 16 27.5 16 27.5Z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M16 10v8M12 14h8"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                <div>
                  <p className="text-[15px] font-bold tracking-tight text-slate-950">
                    Perfect Smile
                  </p>
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                    Clinic Workspace
                  </p>
                </div>
              </div>

              <div className="hidden items-center gap-2 rounded-full border border-white/80 bg-white/60 px-3 py-2 text-[11px] font-semibold text-slate-600 shadow-sm backdrop-blur sm:flex">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                System operational
              </div>
            </div>

            {/* Main content */}
            <div className="max-w-2xl py-12">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-teal-200/80 bg-white/70 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-teal-700 shadow-sm backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                Your clinic at a glance
              </div>

              <h1 className="max-w-xl text-[3.7rem] font-bold leading-[0.98] tracking-[-0.045em] text-slate-950 xl:text-[4.35rem]">
                Everything your
                <br />
                clinic needs.
                <br />
                <span className="text-teal-700">One workspace.</span>
              </h1>

              <p className="mt-7 max-w-xl text-[17px] leading-8 text-slate-600">
                Keep appointments, patients, follow-ups and daily operations
                connected in one calm, organized workspace built for
                <span className="font-semibold text-slate-800">
                  {" "}
                  Perfect Smile.
                </span>
              </p>

              {/* Operational overview */}
              <div className="mt-12 grid max-w-2xl grid-cols-2 gap-3 xl:grid-cols-4">
                <MetricCard
                  value="12"
                  label="Appointments"
                  detail="Today"
                  icon={<CalendarIcon />}
                />

                <MetricCard
                  value="08"
                  label="Follow-ups"
                  detail="Due soon"
                  icon={<PhoneIcon />}
                />

                <MetricCard
                  value="03"
                  label="Reminders"
                  detail="Pending"
                  icon={<BellIcon />}
                />

                <MetricCard
                  value="47"
                  label="Scheduled"
                  detail="This week"
                  icon={<ChartIcon />}
                />
              </div>

              {/* Small trust line */}
              <div className="mt-8 flex items-center gap-3 text-xs text-slate-500">
                <div className="flex -space-x-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#e9f7f4] bg-slate-900 text-[9px] font-bold text-white">
                    PS
                  </div>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#e9f7f4] bg-teal-600 text-[9px] font-bold text-white">
                    +
                  </div>
                </div>
                <span>
                  A focused workspace for your clinical team
                </span>
              </div>
            </div>

            {/* Bottom */}
            <div className="flex items-end justify-between">
              <p className="text-[11px] font-medium text-slate-500">
                Perfect Smile Management System
              </p>

              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <ShieldIcon />
                Secure workspace
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            RIGHT — LOGIN
        ============================================================ */}
        <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-8 sm:px-8 lg:px-12 xl:px-20">
          {/* Mobile background */}
          <div className="pointer-events-none absolute inset-0 lg:hidden">
            <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-teal-100/60 blur-3xl" />
            <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-cyan-50 blur-3xl" />
          </div>

          <div className="relative z-10 w-full max-w-[470px]">
            {/* Mobile brand */}
            <div className="mb-10 flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950">
                <svg
                  viewBox="0 0 32 32"
                  className="h-5 w-5 text-white"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M16 27.5S5.5 21.1 5.5 12.8C5.5 8.8 8.2 6 11.8 6c2.1 0 3.4 1 4.2 2.4C16.8 7 18.1 6 20.2 6c3.6 0 6.3 2.8 6.3 6.8C26.5 21.1 16 27.5 16 27.5Z"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M16 10v8M12 14h8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <div>
                <p className="text-sm font-bold text-slate-950">
                  Perfect Smile
                </p>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Clinic Workspace
                </p>
              </div>
            </div>

            {/* Login container */}
            <div className="rounded-[28px] border border-slate-200/80 bg-white p-7 shadow-[0_25px_80px_-35px_rgba(15,23,42,0.28)] sm:p-10">
              {/* Header */}
              <div>
                <div className="mb-8 flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                    <LockIcon />
                  </div>

                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    Staff access
                  </span>
                </div>

                <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">
                  {greeting}
                </p>

                <h2 className="mt-2 text-[2.25rem] font-bold tracking-[-0.04em] text-slate-950">
                  Welcome back.
                </h2>

                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                  Sign in to continue to your Perfect Smile clinic workspace.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="mt-9 space-y-5">
                <div>
                  <label
                    htmlFor="loginEmail"
                    className="mb-2 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600"
                  >
                    Email address
                  </label>

                  <Input
                    id="loginEmail"
                    type="email"
                    autoComplete="email"
                    placeholder="name@perfectsmileclinic.com"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label
                      htmlFor="loginPassword"
                      className="block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600"
                    >
                      Password
                    </label>
                  </div>

                  <div className="relative">
                    <Input
                      id="loginPassword"
                      type={passwordVisible ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />

                    <button
                      type="button"
                      onClick={() => setPasswordVisible((visible) => !visible)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      tabIndex={-1}
                      aria-label={
                        passwordVisible
                          ? "Hide password"
                          : "Show password"
                      }
                    >
                      {passwordVisible ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="mt-3 h-12 w-full rounded-xl text-sm font-bold shadow-lg shadow-teal-700/10 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl disabled:hover:translate-y-0"
                  disabled={submitting}
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Signing in...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Sign in to workspace
                      <ArrowIcon />
                    </span>
                  )}
                </Button>
              </form>

              {/* Security */}
              <div className="mt-7 border-t border-slate-100 pt-6">
                <div className="flex items-center justify-center gap-2 text-[11px] font-medium text-slate-400">
                  <ShieldIcon />
                  Secured with Supabase authentication
                </div>
              </div>
            </div>

            {/* Outside card */}
            <div className="mt-6 flex items-center justify-center gap-2 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Private clinic workspace
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

/* ================================================================
   METRIC CARD
================================================================ */

function MetricCard({
  value,
  label,
  detail,
  icon,
}: {
  value: string;
  label: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="group rounded-2xl border border-white/80 bg-white/75 p-4 shadow-[0_12px_35px_-20px_rgba(15,23,42,0.3)] backdrop-blur transition-all duration-200 hover:-translate-y-1 hover:bg-white">
      <div className="mb-5 flex items-start justify-between">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-teal-700 transition group-hover:bg-teal-50">
          {icon}
        </div>

        <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
          {detail}
        </span>
      </div>

      <p className="text-2xl font-bold tracking-tight text-slate-950">
        {value}
      </p>

      <p className="mt-1 text-[11px] font-medium text-slate-500">
        {label}
      </p>
    </div>
  );
}

/* ================================================================
   ICONS
================================================================ */

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
      <rect
        x="3"
        y="5"
        width="18"
        height="16"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M8 3v4M16 3v4M3 10h18"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
      <path
        d="M7.2 3.5 4.7 5c-.8.5-1.1 1.5-.8 2.4 2 6.2 6.5 10.7 12.7 12.7.9.3 1.9 0 2.4-.8l1.5-2.5c.4-.7.2-1.6-.5-2l-3.3-1.9c-.6-.3-1.3-.2-1.8.3l-1.3 1.3c-2.2-1.2-4-3-5.2-5.2l1.3-1.3c.5-.5.6-1.2.3-1.8L9.2 4c-.4-.7-1.3-.9-2-.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
      <path
        d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
      <path
        d="M4 19V5M4 19h17"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="m7 15 4-4 3 2 5-6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none">
      <path
        d="M12 3 20 6v5c0 5-3.3 8.7-8 10-4.7-1.3-8-5-8-10V6l8-3Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="m9 12 2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <rect
        x="5"
        y="10"
        width="14"
        height="11"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M8 10V7a4 4 0 0 1 8 0v3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M12 14v3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
      <path
        d="M4 10h11M11 6l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}