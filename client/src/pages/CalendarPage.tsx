import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Appointment, AppointmentStatus } from "@shared/types/index";

import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

import {
  addDays,
  localDateString,
  parseAppointmentDate,
} from "@/lib/date";

import {
  APPOINTMENT_STATUSES,
  computeStatusCounts,
  getInitials,
  isOverdueToday,
  isTerminalStatus,
} from "@/lib/appointments";

import { buildWhatsAppUrl } from "@/lib/whatsapp";
import {
  appointmentApi,
  sendTomorrowReminder,
} from "@/services/appointments";
import { useToast } from "@/hooks/useToast";

type CalendarView = "month" | "week" | "day";

const dayNames = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

const slots = [
  "08:00 AM",
  "08:30 AM",
  "09:00 AM",
  "09:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "12:30 PM",
  "01:00 PM",
  "01:30 PM",
  "02:00 PM",
  "02:30 PM",
  "03:00 PM",
  "03:30 PM",
  "04:00 PM",
  "04:30 PM",
  "05:00 PM",
  "05:30 PM",
  "06:00 PM",
];

const statusStyles: Record<Appointment["status"], string> = {
  Scheduled:
    "bg-amber-50 border-amber-200 text-amber-800",
  Completed:
    "bg-emerald-50 border-emerald-200 text-emerald-800",
  Cancelled:
    "bg-rose-50 border-rose-200 text-rose-800",
  "Checked in":
    "bg-sky-50 border-sky-200 text-sky-800",
  "In treatment":
    "bg-violet-50 border-violet-200 text-violet-800",
  "No-show":
    "bg-rose-50 border-rose-200 text-rose-800",
};

const statusDotStyles: Record<Appointment["status"], string> = {
  Scheduled: "bg-amber-400",
  Completed: "bg-emerald-500",
  Cancelled: "bg-rose-500",
  "Checked in": "bg-sky-500",
  "In treatment": "bg-violet-500",
  "No-show": "bg-rose-500",
};

export function CalendarPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [view, setView] =
    useState<CalendarView>("month");

  const [date, setDate] =
    useState(() => new Date());

  const [appointments, setAppointments] =
    useState<Appointment[]>([]);

  const [selected, setSelected] =
    useState<Appointment | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const range = useMemo(
    () => getRange(date, view),
    [date, view],
  );

  const visibleAppointments = useMemo(
    () =>
      appointments.filter(
        (appointment) =>
          appointment.appointment_date >=
            localDateString(range.start) &&
          appointment.appointment_date <=
            localDateString(range.end),
      ),
    [appointments, range],
  );

  const todayAppointments = useMemo(
    () =>
      appointmentsOn(
        appointments,
        new Date(),
      ),
    [appointments],
  );

  const todayStats = useMemo(
    () => computeStatusCounts(todayAppointments),
    [todayAppointments],
  );

  async function loadAppointments() {
    setLoading(true);
    setError(null);

    try {
      const data =
        await appointmentApi.list();

      setAppointments(data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load calendar appointments",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAppointments();
  }, []);

  async function updateAppointmentStatus(
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

      setSelected((current) =>
        current && current.id === updated.id
          ? updated
          : current,
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

  async function completeAppointment(
    appointment: Appointment,
  ) {
    await updateAppointmentStatus(
      appointment,
      "Completed",
      "Appointment marked as completed",
    );
  }

  async function cancelAppointment(
    appointment: Appointment,
  ) {
    await updateAppointmentStatus(
      appointment,
      "Cancelled",
      "Appointment marked as cancelled",
    );
  }

  async function noShowAppointment(
    appointment: Appointment,
  ) {
    await updateAppointmentStatus(
      appointment,
      "No-show",
      "Appointment marked as no-show",
    );
  }

  async function restoreAppointment(
    appointment: Appointment,
  ) {
    await updateAppointmentStatus(
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

      setAppointments((current) =>
        current.map((item) =>
          item.id === updated.id
            ? updated
            : item,
        ),
      );

      setSelected((current) =>
        current && current.id === updated.id
          ? updated
          : current,
      );

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

  function navigateDate(
    direction: number,
  ) {
    const next = new Date(date);

    if (view === "month") {
      next.setMonth(
        next.getMonth() + direction,
      );
    } else if (view === "week") {
      next.setDate(
        next.getDate() + direction * 7,
      );
    } else {
      next.setDate(
        next.getDate() + direction,
      );
    }

    setDate(next);
  }

  function goToday() {
    setDate(new Date());
  }

  const title =
    view === "month"
      ? date.toLocaleDateString("en-GB", {
          month: "long",
          year: "numeric",
        })
      : view === "week"
        ? `${formatShort(
            range.start,
          )} – ${formatLong(range.end)}`
        : date.toLocaleDateString(
            "en-GB",
            {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            },
          );

  const isCurrentPeriod =
    view === "month"
      ? date.getMonth() ===
          new Date().getMonth() &&
        date.getFullYear() ===
          new Date().getFullYear()
      : view === "week"
        ? localDateString(
            range.start,
          ) <= localDateString(
            new Date(),
          ) &&
          localDateString(
            range.end,
          ) >= localDateString(
            new Date(),
          )
        : localDateString(date) ===
          localDateString(new Date());

  return (
    <div className="space-y-7 pb-12">
      <PageHeader
        eyebrow="Clinic operations"
        title="Calendar"
        description="Your clinic schedule, appointments and patient flow in one place."
        action={
          <Button
            onClick={() =>
              navigate(
                "/appointments/new",
              )
            }
          >
            + New appointment
          </Button>
        }
      />

      {/* ========================================================== */}
      {/* HERO / OVERVIEW                                             */}
      {/* ========================================================== */}

      <section className="relative overflow-hidden rounded-[24px] border border-teal-100 bg-gradient-to-br from-white via-white to-teal-50/80 shadow-[0_20px_60px_-35px_rgba(15,118,110,0.35)]">
        <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-teal-200/25 blur-3xl" />

        <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:p-9">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal-100 bg-white/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-teal-700 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
              Clinic schedule
            </div>

            <h2 className="max-w-2xl text-3xl font-bold tracking-[-0.045em] text-slate-950 sm:text-4xl">
              Everything scheduled.
              <br />
              Nothing overlooked.
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              Navigate your clinic schedule, see patient
              flow at a glance, and open any appointment
              for the full details.
            </p>

            <div className="mt-7 flex flex-wrap gap-2">
              <OverviewPill
                label="Today"
                value={
                  todayAppointments.length
                }
              />

              <OverviewPill
                label="Confirmed"
                value={todayStats.confirmed}
              />

              <OverviewPill
                label="Completed"
                value={todayStats.completed}
              />

              <OverviewPill
                label="Cancelled / no-show"
                value={
                  todayStats.cancelledOrNoShow
                }
              />
            </div>
          </div>

          <div className="hidden items-center justify-center lg:flex">
            <div className="relative flex h-32 w-32 items-center justify-center rounded-full border border-teal-100 bg-white shadow-[0_15px_40px_-25px_rgba(15,118,110,0.6)]">
              <div className="absolute inset-2 rounded-full border border-dashed border-teal-100" />

              <div className="text-center">
                <p className="text-3xl font-bold tracking-tight text-teal-700">
                  {visibleAppointments.length}
                </p>

                <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Visible
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================== */}
      {/* CALENDAR                                                    */}
      {/* ========================================================== */}

      <Card className="overflow-hidden border-slate-200/80 shadow-[0_22px_65px_-40px_rgba(15,23,42,0.45)]">
        {/* Calendar toolbar */}
        <div className="border-b border-slate-100 bg-white px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-label="Previous period"
                onClick={() =>
                  navigateDate(-1)
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
              >
                <ChevronLeftIcon />
              </button>

              <button
                type="button"
                aria-label="Next period"
                onClick={() =>
                  navigateDate(1)
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
              >
                <ChevronRightIcon />
              </button>

              <button
                type="button"
                onClick={goToday}
                className={`ml-1 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition ${
                  isCurrentPeriod
                    ? "border-teal-200 bg-teal-50 text-teal-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
                }`}
              >
                Today
              </button>

              <div className="mx-1 hidden h-7 w-px bg-slate-200 sm:block" />

              <div className="min-w-[180px] px-1">
                <p className="text-base font-bold tracking-tight text-slate-950">
                  {title}
                </p>

                <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                  {visibleAppointments.length}{" "}
                  {visibleAppointments.length ===
                  1
                    ? "appointment"
                    : "appointments"}{" "}
                  in view
                </p>
              </div>
            </div>

            {/* View switcher */}
            <div className="inline-flex w-fit rounded-xl bg-slate-100 p-1">
              {(
                [
                  ["month", "Month"],
                  ["week", "Week"],
                  ["day", "Day"],
                ] as const
              ).map(
                ([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setView(value)
                    }
                    className={`rounded-lg px-4 py-2 text-[11px] font-bold transition ${
                      view === value
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-400 hover:text-slate-700"
                    }`}
                  >
                    {label}
                  </button>
                ),
              )}
            </div>
          </div>
        </div>

        {/* Status legend */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-slate-100 bg-slate-50/60 px-4 py-3 sm:px-6">
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">
            Status
          </span>

          {APPOINTMENT_STATUSES.map(
            (status) => (
              <span
                key={status}
                className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500"
              >
                <span
                  className={`h-2 w-2 rounded-full ${statusDotStyles[status]}`}
                />

                {status}
              </span>
            ),
          )}
        </div>

        {/* Calendar content */}
        {loading ? (
          <div className="py-20">
            <LoadingState label="Loading clinic calendar..." />
          </div>
        ) : error ? (
          <div className="p-6">
            <ErrorState
              title="Calendar could not be loaded"
              description={error}
              onRetry={() =>
                void loadAppointments()
              }
            />
          </div>
        ) : (
          <>
            {visibleAppointments.length ===
              0 && (
              <div className="border-b border-slate-100 px-6 py-8">
                <EmptyState
                  title="No appointments in this period"
                  description="There are no appointments scheduled for the visible date range."
                />
              </div>
            )}

            <div className="overflow-x-auto">
              <div className="min-w-[760px]">
                {view === "month" ? (
                  <MonthView
                    date={date}
                    appointments={
                      visibleAppointments
                    }
                    onSelect={
                      setSelected
                    }
                  />
                ) : view === "week" ? (
                  <WeekView
                    date={date}
                    appointments={
                      visibleAppointments
                    }
                    onSelect={
                      setSelected
                    }
                  />
                ) : (
                  <DayView
                    date={date}
                    appointments={
                      visibleAppointments
                    }
                    onSelect={
                      setSelected
                    }
                  />
                )}
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Appointment detail */}
      <AppointmentDetail
        appointment={selected}
        onClose={() =>
          setSelected(null)
        }
        onEdit={() => {
          if (selected) {
            navigate(
              "/appointments/new",
              {
                state: {
                  appointment:
                    selected,
                },
              },
            );
          }

          setSelected(null);
        }}
        onComplete={() =>
          selected &&
          void completeAppointment(selected)
        }
        onCancel={() =>
          selected &&
          void cancelAppointment(selected)
        }
        onNoShow={() =>
          selected &&
          void noShowAppointment(selected)
        }
        onRestore={() =>
          selected &&
          void restoreAppointment(selected)
        }
        onSendReminder={() =>
          selected &&
          void sendReminder(selected)
        }
      />
    </div>
  );
}

/* ================================================================== */
/* OVERVIEW PILL                                                       */
/* ================================================================== */

function OverviewPill({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 shadow-sm">
      <span className="text-sm font-bold text-slate-900">
        {value}
      </span>

      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </span>
    </div>
  );
}

/* ================================================================== */
/* RANGE HELPERS                                                       */
/* ================================================================== */

function getRange(
  date: Date,
  view: CalendarView,
) {
  if (view === "month") {
    return {
      start: new Date(
        date.getFullYear(),
        date.getMonth(),
        1,
      ),
      end: new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        0,
      ),
    };
  }

  if (view === "week") {
    const start = new Date(date);

    start.setDate(
      date.getDate() - date.getDay(),
    );

    return {
      start,
      end: addDays(start, 6),
    };
  }

  return {
    start: new Date(date),
    end: new Date(date),
  };
}

function formatShort(date: Date) {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function formatLong(date: Date) {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function appointmentsOn(
  appointments: Appointment[],
  date: Date,
) {
  const key =
    localDateString(date);

  return appointments
    .filter(
      (appointment) =>
        appointment.appointment_date ===
        key,
    )
    .sort((a, b) =>
      a.assigned_slot.localeCompare(
        b.assigned_slot,
      ),
    );
}

/* ================================================================== */
/* APPOINTMENT PILL                                                    */
/* ================================================================== */

function AppointmentPill({
  appointment,
  onSelect,
}: {
  appointment: Appointment;
  onSelect: (
    appointment: Appointment,
  ) => void;
}) {
  return (
    <button
      type="button"
      onClick={() =>
        onSelect(appointment)
      }
      title={`${appointment.patient_name} · ${appointment.assigned_slot} · ${appointment.status}`}
      className={`group mb-1.5 flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-all hover:-translate-y-[1px] hover:shadow-sm ${statusStyles[appointment.status]}`}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDotStyles[appointment.status]}`}
      />

      <span className="min-w-0 flex-1 truncate text-[10px] font-bold">
        {appointment.patient_name}
      </span>

      <span className="shrink-0 text-[9px] font-semibold opacity-70">
        {appointment.assigned_slot}
      </span>
    </button>
  );
}

/* ================================================================== */
/* MONTH VIEW                                                          */
/* ================================================================== */

function MonthView({
  date,
  appointments,
  onSelect,
}: ViewProps & {
  date: Date;
}) {
  const firstDay =
    new Date(
      date.getFullYear(),
      date.getMonth(),
      1,
    ).getDay();

  const days =
    new Date(
      date.getFullYear(),
      date.getMonth() + 1,
      0,
    ).getDate();

  const totalCells =
    Math.ceil(
      (firstDay + days) / 7,
    ) * 7;

  return (
    <>
      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/70">
        {dayNames.map((day) => (
          <div
            key={day}
            className="border-r border-slate-100 py-3 text-center text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400"
          >
            {day}
          </div>
        ))}
      </div>

      <div
        className="grid grid-cols-7"
        style={{
          gridAutoRows:
            "minmax(135px, auto)",
        }}
      >
        {Array.from(
          {
            length: totalCells,
          },
          (_, index) => {
            const dayNumber =
              index - firstDay + 1;

            const isCurrentMonth =
              dayNumber >= 1 &&
              dayNumber <= days;

            if (!isCurrentMonth) {
              return (
                <div
                  key={`empty-${index}`}
                  className="border-r border-b border-slate-100 bg-slate-50/30"
                />
              );
            }

            const current =
              new Date(
                date.getFullYear(),
                date.getMonth(),
                dayNumber,
              );

            const items =
              appointmentsOn(
                appointments,
                current,
              );

            const isToday =
              localDateString(
                current,
              ) ===
              localDateString(
                new Date(),
              );

            return (
              <div
                key={dayNumber}
                className={`group relative border-r border-b border-slate-100 p-2.5 transition ${
                  isToday
                    ? "bg-teal-50/45"
                    : "hover:bg-slate-50/60"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span
                    className={
                      isToday
                        ? "flex h-7 w-7 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white shadow-sm"
                        : "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-slate-600"
                    }
                  >
                    {dayNumber}
                  </span>

                  {items.length > 0 && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-400">
                      {items.length}
                    </span>
                  )}
                </div>

                <div className="max-h-[92px] overflow-hidden">
                  {items
                    .slice(0, 3)
                    .map(
                      (appointment) => (
                        <AppointmentPill
                          key={
                            appointment.id
                          }
                          appointment={
                            appointment
                          }
                          onSelect={
                            onSelect
                          }
                        />
                      ),
                    )}

                  {items.length > 3 && (
                    <button
                      type="button"
                      onClick={() => {
                        const first =
                          items[3];

                        if (first) {
                          onSelect(
                            first,
                          );
                        }
                      }}
                      className="pl-1 text-[9px] font-bold text-slate-400 transition hover:text-teal-600"
                    >
                      +{items.length - 3} more
                    </button>
                  )}
                </div>
              </div>
            );
          },
        )}
      </div>
    </>
  );
}

/* ================================================================== */
/* WEEK VIEW                                                           */
/* ================================================================== */

function WeekView({
  date,
  appointments,
  onSelect,
}: ViewProps & {
  date: Date;
}) {
  const range =
    getRange(date, "week");

  const days = Array.from(
    { length: 7 },
    (_, index) =>
      addDays(
        range.start,
        index,
      ),
  );

  return (
    <>
      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/70">
        {days.map((day) => {
          const isToday =
            localDateString(day) ===
            localDateString(
              new Date(),
            );

          const items =
            appointmentsOn(
              appointments,
              day,
            );

          return (
            <div
              key={localDateString(
                day,
              )}
              className={`border-r border-slate-100 px-2 py-4 text-center ${
                isToday
                  ? "bg-teal-50"
                  : ""
              }`}
            >
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                {dayNames[
                  day.getDay()
                ]}
              </p>

              <div className="mt-1 flex items-center justify-center gap-2">
                <p
                  className={
                    isToday
                      ? "text-xl font-bold text-teal-700"
                      : "text-xl font-bold text-slate-800"
                  }
                >
                  {day.getDate()}
                </p>

                {items.length > 0 && (
                  <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[8px] font-bold text-slate-500">
                    {items.length}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid min-h-[500px] grid-cols-7">
        {days.map((day) => {
          const items =
            appointmentsOn(
              appointments,
              day,
            );

          return (
            <div
              key={localDateString(
                day,
              )}
              className="border-r border-slate-100 p-2 align-top"
            >
              {items.length === 0 ? (
                <div className="mt-2 rounded-lg border border-dashed border-slate-100 px-2 py-5 text-center text-[9px] font-medium text-slate-300">
                  No appointments
                </div>
              ) : (
                items.map(
                  (appointment) => (
                    <AppointmentPill
                      key={
                        appointment.id
                      }
                      appointment={
                        appointment
                      }
                      onSelect={
                        onSelect
                      }
                    />
                  ),
                )
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ================================================================== */
/* DAY VIEW                                                            */
/* ================================================================== */

function DayView({
  date,
  appointments,
  onSelect,
}: ViewProps & {
  date: Date;
}) {
  const dayAppointments =
    appointmentsOn(
      appointments,
      date,
    );

  return (
    <div className="divide-y divide-slate-100">
      {slots.map((slot) => {
        const items =
          dayAppointments.filter(
            (appointment) =>
              appointment.assigned_slot ===
              slot,
          );

        return (
          <div
            key={slot}
            className="flex min-h-[62px] items-start gap-5 px-6 py-3 transition hover:bg-slate-50/40"
          >
            <span className="w-20 shrink-0 pt-2 text-[10px] font-bold text-slate-400">
              {slot}
            </span>

            <div className="min-w-0 flex-1">
              {items.length === 0 ? (
                <div className="border-l-2 border-dashed border-slate-100 py-1 pl-4 text-[10px] font-medium text-slate-300">
                  Available
                </div>
              ) : (
                items.map(
                  (appointment) => (
                    <AppointmentPill
                      key={
                        appointment.id
                      }
                      appointment={
                        appointment
                      }
                      onSelect={
                        onSelect
                      }
                    />
                  ),
                )
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ================================================================== */
/* TYPES                                                               */
/* ================================================================== */

interface ViewProps {
  appointments: Appointment[];
  onSelect: (
    appointment: Appointment,
  ) => void;
}

/* ================================================================== */
/* APPOINTMENT DETAIL                                                  */
/* ================================================================== */

function AppointmentDetail({
  appointment,
  onClose,
  onEdit,
  onComplete,
  onCancel,
  onNoShow,
  onRestore,
  onSendReminder,
}: {
  appointment: Appointment | null;
  onClose: () => void;
  onEdit: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onNoShow: () => void;
  onRestore: () => void;
  onSendReminder: () => void;
}) {
  if (!appointment) {
    return null;
  }

  const date =
    parseAppointmentDate(
      appointment.appointment_date,
    ).toLocaleDateString(
      "en-GB",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      },
    );

  const message = `Hello ${appointment.patient_name},

This is a reminder from *Perfect Smile Dental Clinic*.

*Date:* ${date}
*Time:* ${appointment.assigned_slot}

Please arrive *10 minutes early*.

Thank you,
Perfect Smile Dental Clinic`;

  const terminal = isTerminalStatus(
    appointment.status,
  );

  const overdue = isOverdueToday(appointment);

  const tomorrow = localDateString(
    addDays(new Date(), 1),
  );

  const isTomorrow =
    appointment.appointment_date === tomorrow;

  const isReminderEligible =
    isTomorrow &&
    appointment.status === "Scheduled" &&
    !appointment.reminder_sent;

  const reminderAlreadySent =
    isTomorrow &&
    Boolean(appointment.reminder_sent);

  return (
    <Modal
      open={Boolean(appointment)}
      onClose={onClose}
      title="Appointment details"
    >
      <div className="space-y-5">
        {/* Patient header */}
        <div className="relative overflow-hidden rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50/80 to-white p-5">
          <div className="absolute -right-8 -top-10 h-24 w-24 rounded-full bg-teal-100/60 blur-2xl" />

          <div className="relative flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-bold text-teal-700 shadow-sm">
              {getInitials(
                appointment.patient_name,
              )}
            </div>

            <div className="min-w-0">
              <h3 className="truncate text-base font-bold capitalize text-slate-950">
                {appointment.patient_name}
              </h3>

              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${statusDotStyles[appointment.status]}`}
                />

                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {appointment.status}
                </span>

                {overdue && (
                  <Badge variant="amber">
                    Overdue
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-x-5 gap-y-5 rounded-2xl border border-slate-100 bg-slate-50/50 p-5">
          <Detail
            label="Appointment date"
            value={date}
          />

          <Detail
            label="Time slot"
            value={
              appointment.assigned_slot ||
              "-"
            }
          />

          <Detail
            label="Phone"
            value={
              appointment.phone_number ||
              "-"
            }
          />

          <Detail
            label="Booking source"
            value={
              appointment.booking_source ||
              "-"
            }
          />

          <Detail
            label="Treatment"
            value={
              appointment.treatment_name ||
              "Not specified"
            }
          />

          {appointment.notes && (
            <Detail
              label="Notes"
              value={
                appointment.notes
              }
              wide
            />
          )}
        </div>

        {/* Status actions */}
        {!terminal ? (
          <div className="grid grid-cols-3 gap-3">
            <Button
              size="sm"
              onClick={onComplete}
            >
              Complete
            </Button>

            <Button
              size="sm"
              variant="secondary"
              onClick={onCancel}
            >
              Cancel
            </Button>

            <Button
              size="sm"
              variant="danger"
              onClick={onNoShow}
            >
              No-show
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            onClick={onRestore}
          >
            Restore to scheduled
          </Button>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          {isReminderEligible ? (
            <button
              type="button"
              onClick={onSendReminder}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
            >
              <WhatsAppIcon />
              Send WhatsApp reminder
            </button>
          ) : reminderAlreadySent ? (
            <span className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-xs font-bold text-emerald-700">
              Reminder sent
            </span>
          ) : (
            <a
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
              href={buildWhatsAppUrl(
                appointment.phone_number,
                message,
              )}
              target="_blank"
              rel="noreferrer"
            >
              <WhatsAppIcon />
              WhatsApp
            </a>
          )}

          <Button onClick={onEdit}>
            Edit appointment
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ================================================================== */
/* DETAIL                                                              */
/* ================================================================== */

function Detail({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div
      className={
        wide ? "col-span-2" : ""
      }
    >
      <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.13em] text-slate-400">
        {label}
      </p>

      <p className="whitespace-pre-wrap text-xs font-semibold leading-5 text-slate-800">
        {value}
      </p>
    </div>
  );
}

/* ================================================================== */
/* ICONS                                                               */
/* ================================================================== */

function ChevronLeftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        d="m14.5 5-7 7 7 7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        d="m9.5 5 7 7-7 7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4A8 8 0 1 1 20 11.5Z" />
      <path d="M9 8.5c.3-.3.7-.2.9.2l.8 1.3c.2.3.1.6-.1.8l-.5.5c.5 1 1.3 1.8 2.4 2.3l.5-.5c.2-.2.5-.3.8-.1l1.3.7c.4.2.5.6.2.9-.4.5-1 .8-1.6.7-2.7-.5-5-2.8-5.5-5.5-.1-.5.2-1.1.8-1.3Z" />
    </svg>
  );
}
