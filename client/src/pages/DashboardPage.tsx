import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type {
  Appointment,
  AppointmentStatus,
} from "@shared/types/index";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHeader } from "@/components/PageHeader";

import {
  computeStatusCounts,
  displayStatusLabel,
  isOverdueToday,
  isTerminalStatus,
  parseSlotMinutes,
  selectFocusAppointment,
} from "@/lib/appointments";
import { localDateString } from "@/lib/date";
import {
  appointmentApi,
  sendTomorrowReminder,
} from "@/services/appointments";
import { useToast } from "@/hooks/useToast";

export function DashboardPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [manualFocusId, setManualFocusId] =
    useState<Appointment["id"] | null>(null);

  const [pendingReminders, setPendingReminders] =
    useState<Appointment[]>([]);
  const [sentReminders, setSentReminders] =
    useState<Appointment[]>([]);
  const [remindersLoading, setRemindersLoading] =
    useState(true);
  const [remindersError, setRemindersError] =
    useState<string | null>(null);

  async function loadAppointments() {
    setLoading(true);
    setError(null);

    try {
      const data = await appointmentApi.list();
      setAppointments(data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load appointments",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadReminders() {
    setRemindersLoading(true);
    setRemindersError(null);

    try {
      const reminders =
        await appointmentApi.tomorrowReminders();

      setPendingReminders(reminders.pending);
      setSentReminders(reminders.sent);
    } catch (requestError) {
      setRemindersError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load reminders",
      );
    } finally {
      setRemindersLoading(false);
    }
  }

  useEffect(() => {
    void loadAppointments();
  }, []);

  useEffect(() => {
    void loadReminders();
  }, []);

  const today = localDateString();

  const todayAppointments = appointments.filter(
    (appointment) =>
      appointment.appointment_date === today,
  );

  const todayStats = computeStatusCounts(todayAppointments);

  const progress =
    todayStats.total > 0
      ? Math.round(
          (todayStats.completed / todayStats.total) * 100,
        )
      : 0;

  /*
   * The focus panel shows whichever appointment was explicitly
   * selected from the queue below, or otherwise the automatically
   * derived one: an overdue-and-unresolved appointment first, then
   * the earliest still-upcoming confirmed appointment.
   */
  const autoFocusAppointment = selectFocusAppointment(
    todayAppointments,
  );

  const manualFocusAppointment =
    manualFocusId != null
      ? todayAppointments.find(
          (appointment) =>
            appointment.id === manualFocusId,
        )
      : undefined;

  const focusAppointment =
    manualFocusAppointment ?? autoFocusAppointment;

  const focusIsOverdue = focusAppointment
    ? isOverdueToday(focusAppointment)
    : false;

  const sortedQueue = [...todayAppointments].sort(
    (a, b) => {
      const aMinutes =
        parseSlotMinutes(a.assigned_slot) ??
        Number.MAX_SAFE_INTEGER;

      const bMinutes =
        parseSlotMinutes(b.assigned_slot) ??
        Number.MAX_SAFE_INTEGER;

      return aMinutes - bMinutes;
    },
  );

  async function updateStatus(
    appointment: Appointment,
    status: AppointmentStatus,
    message: string,
  ) {
    try {
      const updated =
        await appointmentApi.updateStatus(
          appointment.id,
          status,
        );

      setAppointments((current) =>
        current.map((item) =>
          item.id === updated.id
            ? updated
            : item,
        ),
      );

      showToast(message, "success");
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "Failed to update appointment",
        "error",
      );
    }
  }

  /*
   * Resolving the focused appointment clears the manual selection so
   * the panel automatically advances to whatever needs attention next
   * (overdue first, then earliest upcoming) — the behavior we're
   * preserving from the original Next Appointment card.
   */
  async function markCompleted(
    appointment: Appointment,
  ) {
    await updateStatus(
      appointment,
      "Completed",
      "Appointment marked as completed",
    );
    setManualFocusId(null);
  }

  async function markCancelled(
    appointment: Appointment,
  ) {
    await updateStatus(
      appointment,
      "Cancelled",
      "Appointment marked as cancelled",
    );
    setManualFocusId(null);
  }

  async function markNoShow(
    appointment: Appointment,
  ) {
    await updateStatus(
      appointment,
      "No-show",
      "Appointment marked as no-show",
    );
    setManualFocusId(null);
  }

  /*
   * Restoring does NOT clear manual focus: staff just fixed a mistake
   * and almost always want to immediately decide what to actually do
   * with the appointment, so it stays focused and actionable.
   */
  async function restoreAppointment(
    appointment: Appointment,
  ) {
    await updateStatus(
      appointment,
      "Scheduled",
      "Appointment restored to scheduled",
    );
  }

  async function sendReminder(
    appointment: Appointment,
  ) {
    try {
      const updated =
        await sendTomorrowReminder(appointment);

      setPendingReminders((current) =>
        current.filter(
          (item) =>
            item.id !== updated.id,
        ),
      );

      setSentReminders((current) => [
        updated,
        ...current.filter(
          (item) =>
            item.id !== updated.id,
        ),
      ]);

      setAppointments((current) =>
        current.map((item) =>
          item.id === updated.id
            ? updated
            : item,
        ),
      );

      await loadReminders();

      showToast(
        "WhatsApp opened. Reminder sent.",
        "success",
      );
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "Unable to trigger reminder",
        "error",
      );
    }
  }

  const greeting = getGreeting();

  const formattedDate =
    new Date().toLocaleDateString(
      "en-GB",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      },
    );

  return (
    <div className="space-y-7 pb-12">
      <PageHeader
        eyebrow="Clinic operations"
        title={`${greeting}.`}
        description={formattedDate}
        action={
          <Button
            onClick={() =>
              navigate("/appointments/new")
            }
          >
            + New appointment
          </Button>
        }
      />

      {error ? (
        <Card>
          <ErrorState
            title="Appointments could not be loaded"
            description={error}
            onRetry={() =>
              void loadAppointments()
            }
          />
        </Card>
      ) : loading ? (
        <Card>
          <LoadingState label="Loading today's workspace..." />
        </Card>
      ) : (
        <>
          {/* =========================================================
              TODAY OVERVIEW
          ========================================================= */}

          <section className="relative overflow-hidden rounded-[24px] border border-teal-100 bg-gradient-to-br from-white via-white to-teal-50/80 shadow-[0_20px_60px_-35px_rgba(15,118,110,0.35)]">
            <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-teal-200/30 blur-3xl" />

            <div className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-cyan-100/40 blur-3xl" />

            <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_240px] lg:p-9">
              <div>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-teal-100 bg-white/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-teal-700 shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                  Clinic overview
                </div>

                <h2 className="text-3xl font-bold tracking-[-0.04em] text-slate-950 sm:text-4xl">
                  Your day, at a glance.
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                  Keep today's appointments
                  moving and quickly record the
                  outcome of each visit.
                </p>

                <div className="mt-7 grid max-w-xl grid-cols-3 gap-2.5">
                  <OverviewStat
                    value={todayStats.total}
                    label="Bookings"
                  />

                  <OverviewStat
                    value={todayStats.completed}
                    label="Completed"
                  />

                  <OverviewStat
                    value={
                      todayStats.cancelledOrNoShow
                    }
                    label="Cancelled / no-show"
                  />
                </div>
              </div>

              <div className="flex items-center justify-center lg:justify-end">
                <ProgressRing
                  progress={progress}
                />
              </div>
            </div>
          </section>

          {/* =========================================================
              TODAY'S QUEUE + FOCUSED APPOINTMENT
          ========================================================= */}

          <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
            <Card className="overflow-hidden">
              <CardHeader className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    Today's schedule
                  </CardTitle>

                  <p className="mt-1 text-xs text-slate-500">
                    Select any appointment to
                    bring it into focus.
                  </p>
                </div>

                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold text-slate-500">
                  {todayAppointments.length}{" "}
                  {todayAppointments.length ===
                  1
                    ? "appointment"
                    : "appointments"}
                </span>
              </CardHeader>

              <CardBody>
                {sortedQueue.length === 0 ? (
                  <EmptyState
                    title="No appointments scheduled today"
                    description="Your schedule is currently clear."
                  />
                ) : (
                  <div className="space-y-1">
                    {sortedQueue.map(
                      (appointment) => (
                        <QueueRow
                          key={appointment.id}
                          appointment={
                            appointment
                          }
                          isFocused={
                            focusAppointment?.id ===
                            appointment.id
                          }
                          onSelect={() =>
                            setManualFocusId(
                              appointment.id,
                            )
                          }
                        />
                      ),
                    )}
                  </div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {focusIsOverdue
                    ? "Needs attention"
                    : "Next appointment"}
                </CardTitle>

                <p className="mt-1 text-xs text-slate-500">
                  {focusIsOverdue
                    ? "This appointment is overdue and should be resolved first."
                    : "The next confirmed patient today."}
                </p>
              </CardHeader>

              <CardBody>
                {focusAppointment ? (
                  <div
                    className={`rounded-2xl border p-5 ${
                      focusIsOverdue
                        ? "border-amber-200 bg-amber-50/60"
                        : "border-teal-100 bg-teal-50/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p
                          className={`text-xs font-bold uppercase tracking-wider ${
                            focusIsOverdue
                              ? "text-amber-700"
                              : "text-teal-700"
                          }`}
                        >
                          {
                            focusAppointment.assigned_slot
                          }
                        </p>

                        <p className="mt-2 text-xl font-bold capitalize text-slate-950">
                          {
                            focusAppointment.patient_name
                          }
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {
                            focusAppointment.phone_number
                          }
                        </p>

                        {focusAppointment.treatment_name && (
                          <p className="mt-1 text-xs font-semibold text-teal-700">
                            {
                              focusAppointment.treatment_name
                            }
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        <StatusBadge
                          status={
                            focusAppointment.status
                          }
                        />

                        {focusIsOverdue && (
                          <Badge variant="amber">
                            Overdue
                          </Badge>
                        )}
                      </div>
                    </div>

                    {isTerminalStatus(
                      focusAppointment.status,
                    ) ? (
                      <div className="mt-5">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="w-full"
                          onClick={() =>
                            void restoreAppointment(
                              focusAppointment,
                            )
                          }
                        >
                          Restore to scheduled
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-5 grid grid-cols-3 gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            void markCompleted(
                              focusAppointment,
                            )
                          }
                        >
                          Complete
                        </Button>

                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            void markCancelled(
                              focusAppointment,
                            )
                          }
                        >
                          Cancel
                        </Button>

                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() =>
                            void markNoShow(
                              focusAppointment,
                            )
                          }
                        >
                          No-show
                        </Button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          "/appointments/new",
                          {
                            state: {
                              appointment:
                                focusAppointment,
                            },
                          },
                        )
                      }
                      className="group mt-3 flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-xs font-bold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
                    >
                      Edit appointment
                      <ArrowIcon />
                    </button>
                  </div>
                ) : (
                  <EmptyState
                    title="No upcoming patient"
                    description="No confirmed appointment remains today."
                  />
                )}
              </CardBody>
            </Card>
          </div>

          {/* =========================================================
              REMINDERS
          ========================================================= */}

          <div id="tomorrow-reminders">
            <ReminderSection
              pending={pendingReminders}
              sent={sentReminders}
              loading={remindersLoading}
              error={remindersError}
              onRetry={() =>
                void loadReminders()
              }
              onSend={(appointment) =>
                void sendReminder(
                  appointment,
                )
              }
            />
          </div>
        </>
      )}
    </div>
  );
}

/* =================================================================
   REMINDERS
================================================================= */

function ReminderSection({
  pending,
  sent,
  loading,
  error,
  onRetry,
  onSend,
}: {
  pending: Appointment[];
  sent: Appointment[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onSend: (appointment: Appointment) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>
              Tomorrow's reminders
            </CardTitle>

            <p className="mt-1 text-xs text-slate-500">
              Keep tomorrow's patients informed
              before they arrive.
            </p>
          </div>

          <span className="w-fit rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
            {pending.length} pending
          </span>
        </div>
      </CardHeader>

      <CardBody>
        {loading ? (
          <LoadingState label="Loading reminders..." />
        ) : error ? (
          <ErrorState
            title="Reminders could not be loaded"
            description={error}
            onRetry={onRetry}
          />
        ) : pending.length === 0 &&
          sent.length === 0 ? (
          <EmptyState
            title="No appointments tomorrow"
            description="There are no appointments requiring reminders tomorrow."
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {pending.map((appointment) => (
              <ReminderRow
                key={appointment.id}
                appointment={appointment}
                onSend={onSend}
              />
            ))}

            {sent.length > 0 && (
              <>
                <div className="flex items-center gap-3 px-1 pb-2 pt-5">
                  <span className="h-px flex-1 bg-slate-100" />

                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                    Reminder sent
                  </p>

                  <span className="h-px flex-1 bg-slate-100" />
                </div>

                {sent.map((appointment) => (
                  <ReminderRow
                    key={`sent-${appointment.id}`}
                    appointment={appointment}
                    sent
                  />
                ))}
              </>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function ReminderRow({
  appointment,
  sent = false,
  onSend,
}: {
  appointment: Appointment;
  sent?: boolean;
  onSend?: (
    appointment: Appointment,
  ) => void;
}) {
  const date = new Date(
    `${appointment.appointment_date}T00:00:00`,
  ).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="group flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600">
          {getInitials(
            appointment.patient_name,
          )}
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-bold capitalize text-slate-900">
            {appointment.patient_name}
          </p>

          <p className="mt-1 truncate text-xs text-slate-500">
            {date} ·{" "}
            {appointment.assigned_slot}
          </p>
        </div>
      </div>

      {sent ? (
        <span className="flex w-fit items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Reminder sent
        </span>
      ) : (
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            onSend?.(appointment)
          }
        >
          Open WhatsApp reminder
          <ArrowIcon />
        </Button>
      )}
    </div>
  );
}

/* =================================================================
   QUEUE ROW (compact, click-to-focus, no inline actions)
================================================================= */

function QueueRow({
  appointment,
  isFocused,
  onSelect,
}: {
  appointment: Appointment;
  isFocused: boolean;
  onSelect: () => void;
}) {
  const isCompleted =
    appointment.status === "Completed";

  const terminal = isTerminalStatus(
    appointment.status,
  );

  const overdue = isOverdueToday(appointment);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isFocused}
      className={`flex w-full flex-col gap-3 rounded-xl border px-3 py-3 text-left transition sm:flex-row sm:items-center ${
        isFocused
          ? "border-teal-200 bg-teal-50/60"
          : "border-transparent hover:bg-slate-50"
      }`}
    >
      <div className="w-20 shrink-0">
        <p className="text-xs font-bold text-slate-700">
          {appointment.assigned_slot}
        </p>
      </div>

      <div className="relative flex shrink-0 items-center justify-center">
        <span
          className={`absolute h-5 w-5 rounded-full ${
            isCompleted
              ? "bg-emerald-50"
              : terminal
                ? "bg-rose-50"
                : "bg-teal-50"
          }`}
        />

        <span
          className={`relative h-2 w-2 rounded-full ${
            isCompleted
              ? "bg-emerald-500"
              : terminal
                ? "bg-rose-500"
                : "bg-teal-500"
          }`}
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold capitalize text-slate-900">
          {appointment.patient_name}
        </p>

        <p className="mt-0.5 truncate text-xs text-slate-400">
          {appointment.phone_number}
        </p>
      </div>

      <div className="shrink-0">
        <span
          className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-bold ${
            appointment.treatment_name
              ? "border-teal-100 bg-teal-50 text-teal-700"
              : "border-slate-100 bg-slate-50 text-slate-400"
          }`}
        >
          {appointment.treatment_name || "No treatment"}
        </span>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        <StatusBadge
          status={appointment.status}
        />

        {overdue && (
          <Badge variant="amber">
            Overdue
          </Badge>
        )}
      </div>
    </button>
  );
}

/* =================================================================
   STATUS
================================================================= */

function StatusBadge({
  status,
}: {
  status: AppointmentStatus;
}) {
  const label = displayStatusLabel(status);

  const styles =
    label === "Completed"
      ? "border-emerald-100 bg-emerald-50 text-emerald-700"
      : label === "Cancelled" ||
          label === "No-show"
        ? "border-rose-100 bg-rose-50 text-rose-700"
        : "border-teal-100 bg-teal-50 text-teal-700";

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${styles}`}
    >
      {label}
    </span>
  );
}

/* =================================================================
   OVERVIEW
================================================================= */

function OverviewStat({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/75 p-4 shadow-sm backdrop-blur-sm">
      <p className="text-2xl font-bold tracking-tight text-slate-950">
        {value}
      </p>

      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>
    </div>
  );
}

function ProgressRing({
  progress,
}: {
  progress: number;
}) {
  const radius = 50;

  const circumference =
    2 * Math.PI * radius;

  const offset =
    circumference -
    (progress / 100) * circumference;

  return (
    <div className="relative flex h-44 w-44 items-center justify-center">
      <svg
        viewBox="0 0 120 120"
        className="h-44 w-44 -rotate-90"
        aria-label={`${progress}% completed`}
      >
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-slate-100"
        />

        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-teal-500 transition-all duration-500"
        />
      </svg>

      <div className="absolute text-center">
        <p className="text-3xl font-bold tracking-tight text-slate-950">
          {progress}%
        </p>

        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          completed
        </p>
      </div>
    </div>
  );
}

/* =================================================================
   HELPERS
================================================================= */

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 17) {
    return "Good afternoon";
  }

  return "Good evening";
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) =>
      part.charAt(0),
    )
    .join("")
    .toUpperCase();
}

/* =================================================================
   ICONS
================================================================= */

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-3.5 w-3.5"
      fill="none"
      aria-hidden="true"
    >
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
