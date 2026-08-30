import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import type {
  Appointment,
  AppointmentStatus,
} from "@shared/types/index";

import { PageHeader } from "@/components/PageHeader";
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
import { Modal } from "@/components/ui/Modal";

import {
  parseSlotMinutes,
  sourceStyles,
} from "@/lib/appointments";
import { localDateString } from "@/lib/date";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { appointmentApi } from "@/services/appointments";
import { useToast } from "@/hooks/useToast";

type DateFilter = "all" | "today" | "week" | "month";

export function DashboardPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const searchRef = useRef<HTMLInputElement>(null);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] =
    useState<DateFilter>("all");

  const [deleteTarget, setDeleteTarget] =
    useState<Appointment | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const completedToday = todayAppointments.filter(
    (appointment) =>
      appointment.status === "Completed",
  );

  const cancelledToday = todayAppointments.filter(
    (appointment) =>
      appointment.status === "Cancelled" ||
      appointment.status === "No-show",
  );

  const progress =
    todayAppointments.length > 0
      ? Math.round(
          (completedToday.length /
            todayAppointments.length) *
            100,
        )
      : 0;

  const visibleAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      const term = search.trim().toLowerCase();

      const matchesSearch =
        !term ||
        appointment.patient_name
          .toLowerCase()
          .includes(term) ||
        appointment.phone_number.includes(term);

      const matchesDate =
        dateFilter === "all" ||
        (dateFilter === "today" &&
          appointment.appointment_date === today) ||
        (dateFilter === "week" &&
          appointment.appointment_date >= today &&
          appointment.appointment_date <=
            localDateString(
              new Date(
                Date.now() + 7 * 86400000,
              ),
            )) ||
        (dateFilter === "month" &&
          appointment.appointment_date.slice(0, 7) ===
            today.slice(0, 7));

      return matchesSearch && matchesDate;
    });
  }, [
    appointments,
    dateFilter,
    search,
    today,
  ]);

  const nextAppointment = todayAppointments
    .filter((appointment) =>
      isConfirmed(appointment.status),
    )
    .map((appointment) => ({
      appointment,
      minutes: parseSlotMinutes(
        appointment.assigned_slot,
      ),
    }))
    .filter(
      (
        item,
      ): item is {
        appointment: Appointment;
        minutes: number;
      } => item.minutes !== null,
    )
    .filter((item) => {
      const now = new Date();

      const currentMinutes =
        now.getHours() * 60 +
        now.getMinutes();

      return item.minutes >= currentMinutes;
    })
    .sort(
      (a, b) => a.minutes - b.minutes,
    )[0]?.appointment;

  const upcomingAppointments = useMemo(() => {
    return appointments
      .filter(
        (appointment) =>
          appointment.appointment_date >=
            today &&
          isConfirmed(appointment.status),
      )
      .sort((a, b) => {
        if (
          a.appointment_date !==
          b.appointment_date
        ) {
          return a.appointment_date.localeCompare(
            b.appointment_date,
          );
        }

        const aMinutes =
          parseSlotMinutes(
            a.assigned_slot,
          ) ?? Number.MAX_SAFE_INTEGER;

        const bMinutes =
          parseSlotMinutes(
            b.assigned_slot,
          ) ?? Number.MAX_SAFE_INTEGER;

        return aMinutes - bMinutes;
      });
  }, [appointments, today]);

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

  async function markCompleted(
    appointment: Appointment,
  ) {
    await updateStatus(
      appointment,
      "Completed",
      "Appointment marked as completed",
    );
  }

  async function markCancelled(
    appointment: Appointment,
  ) {
    await updateStatus(
      appointment,
      "Cancelled",
      "Appointment marked as cancelled / no-show",
    );
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    setDeleting(true);

    try {
      await appointmentApi.remove(
        deleteTarget.id,
      );

      setAppointments((current) =>
        current.filter(
          (item) =>
            item.id !== deleteTarget.id,
        ),
      );

      setDeleteTarget(null);

      showToast(
        "Appointment deleted successfully",
        "success",
      );
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "Failed to delete appointment",
        "error",
      );
    } finally {
      setDeleting(false);
    }
  }

  async function sendReminder(
    appointment: Appointment,
  ) {
    const date = new Date(
      `${appointment.appointment_date}T00:00:00`,
    ).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    const message = `Hello ${appointment.patient_name},

This is a friendly reminder from *Perfect Smile Dental Clinic*.

You have an appointment tomorrow:
*Date:* ${date}
*Time:* ${appointment.assigned_slot}

Please arrive *10 minutes early*.

To reschedule, please call us as soon as possible.

Thank you,
Perfect Smile Dental Clinic`;

    try {
      const windowHandle =
        window.open(
          buildWhatsAppUrl(
            appointment.phone_number,
            message,
          ),
          "_blank",
        );

      if (!windowHandle) {
        throw new Error(
          "WhatsApp could not be opened. Please allow pop-ups and try again.",
        );
      }

      windowHandle.opener = null;

      const updated =
        await appointmentApi.markReminder(
          appointment.id,
        );

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
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              onClick={() =>
                searchRef.current?.focus()
              }
            >
              Search patients
            </Button>

            <Button
              onClick={() =>
                navigate(
                  "/appointments/new",
                )
              }
            >
              + New appointment
            </Button>
          </div>
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
                    value={
                      todayAppointments.length
                    }
                    label="Bookings"
                  />

                  <OverviewStat
                    value={
                      completedToday.length
                    }
                    label="Completed"
                  />

                  <OverviewStat
                    value={
                      cancelledToday.length
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
              SCHEDULE + NEXT APPOINTMENT
          ========================================================= */}

          <div className="grid gap-5 xl:grid-cols-[1.6fr_0.8fr]">
            <Card className="overflow-hidden">
              <CardHeader className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    Today's schedule
                  </CardTitle>

                  <p className="mt-1 text-xs text-slate-500">
                    Complete or cancel each
                    appointment when the visit is
                    finished.
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
                {todayAppointments.length ===
                0 ? (
                  <EmptyState
                    title="No appointments scheduled today"
                    description="Your schedule is currently clear."
                  />
                ) : (
                  <div className="space-y-1">
                    {[...todayAppointments]
                      .sort((a, b) => {
                        const aMinutes =
                          parseSlotMinutes(
                            a.assigned_slot,
                          ) ??
                          Number.MAX_SAFE_INTEGER;

                        const bMinutes =
                          parseSlotMinutes(
                            b.assigned_slot,
                          ) ??
                          Number.MAX_SAFE_INTEGER;

                        return (
                          aMinutes - bMinutes
                        );
                      })
                      .map((appointment) => (
                        <ScheduleRow
                          key={appointment.id}
                          appointment={
                            appointment
                          }
                          onComplete={() =>
                            void markCompleted(
                              appointment,
                            )
                          }
                          onCancel={() =>
                            void markCancelled(
                              appointment,
                            )
                          }
                        />
                      ))}
                  </div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  Next appointment
                </CardTitle>

                <p className="mt-1 text-xs text-slate-500">
                  The next confirmed patient
                  today.
                </p>
              </CardHeader>

              <CardBody>
                {nextAppointment ? (
                  <div className="rounded-2xl border border-teal-100 bg-teal-50/50 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-teal-700">
                          {
                            nextAppointment.assigned_slot
                          }
                        </p>

                        <p className="mt-2 text-xl font-bold capitalize text-slate-950">
                          {
                            nextAppointment.patient_name
                          }
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {
                            nextAppointment.phone_number
                          }
                        </p>
                      </div>

                      <StatusBadge
                        status={
                          nextAppointment.status
                        }
                      />
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          void markCompleted(
                            nextAppointment,
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
                            nextAppointment,
                          )
                        }
                      >
                        Cancel / no-show
                      </Button>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          "/appointments/new",
                          {
                            state: {
                              appointment:
                                nextAppointment,
                            },
                          },
                        )
                      }
                      className="group mt-3 flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-xs font-bold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
                    >
                      View appointment
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

          {/* =========================================================
              UPCOMING SNAPSHOT
          ========================================================= */}

          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>
                  Upcoming appointments
                </CardTitle>

                <p className="mt-1 text-xs text-slate-500">
                  A quick look at the next
                  confirmed patients.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  navigate("/appointments")
                }
                className="w-fit text-xs font-bold text-teal-700 transition hover:text-teal-900"
              >
                View calendar
                <span className="ml-1">
                  →
                </span>
              </button>
            </CardHeader>

            <CardBody>
              {upcomingAppointments.length ===
              0 ? (
                <EmptyState
                  title="No upcoming appointments"
                  description="There are currently no confirmed appointments ahead."
                />
              ) : (
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {upcomingAppointments
                    .slice(0, 6)
                    .map((appointment) => (
                      <UpcomingAppointmentCard
                        key={appointment.id}
                        appointment={
                          appointment
                        }
                      />
                    ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* =========================================================
              APPOINTMENT MANAGEMENT
          ========================================================= */}

          <Card className="overflow-hidden">
            <CardHeader>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle>
                    Appointment management
                  </CardTitle>

                  <p className="mt-1 text-xs text-slate-500">
                    Search, edit or take action
                    on patient bookings.
                  </p>
                </div>

                <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-500">
                  {visibleAppointments.length}{" "}
                  results
                </span>
              </div>
            </CardHeader>

            <CardBody>
              <div className="mb-5 flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 sm:flex-row">
                <div className="relative flex-1">
                  <SearchIcon />

                  <input
                    ref={searchRef}
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value,
                      )
                    }
                    placeholder="Search patient name or phone..."
                    className="field-control w-full rounded-lg border bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-teal-300 focus:ring-2 focus:ring-teal-100"
                  />
                </div>

                <select
                  value={dateFilter}
                  onChange={(event) =>
                    setDateFilter(
                      event.target
                        .value as DateFilter,
                    )
                  }
                  className="field-control rounded-lg border bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-300 focus:ring-2 focus:ring-teal-100"
                >
                  <option value="all">
                    All dates
                  </option>

                  <option value="today">
                    Today
                  </option>

                  <option value="week">
                    This week
                  </option>

                  <option value="month">
                    This month
                  </option>
                </select>
              </div>

              {visibleAppointments.length ===
              0 ? (
                <EmptyState
                  title="No appointments found"
                  description={
                    appointments.length
                      ? "Try changing the search or date filter."
                      : "Create your first appointment to begin managing patients."
                  }
                />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full min-w-[980px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70">
                        <Header>
                          Patient
                        </Header>

                        <Header>
                          Phone
                        </Header>

                        <Header>
                          Date
                        </Header>

                        <Header>
                          Time
                        </Header>

                        <Header>
                          Source
                        </Header>

                        <Header>
                          Status
                        </Header>

                        <Header>
                          Actions
                        </Header>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {visibleAppointments.map(
                        (appointment) => (
                          <AppointmentRow
                            key={
                              appointment.id
                            }
                            appointment={
                              appointment
                            }
                            onEdit={() =>
                              navigate(
                                "/appointments/new",
                                {
                                  state: {
                                    appointment,
                                  },
                                },
                              )
                            }
                            onDelete={() =>
                              setDeleteTarget(
                                appointment,
                              )
                            }
                            onComplete={() =>
                              void markCompleted(
                                appointment,
                              )
                            }
                            onCancel={() =>
                              void markCancelled(
                                appointment,
                              )
                            }
                          />
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </>
      )}

      {/* =============================================================
          DELETE MODAL
      ============================================================= */}

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() =>
          setDeleteTarget(null)
        }
        title="Delete appointment"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
          <TrashIcon />
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-500">
          Are you sure you want to permanently
          delete this appointment? This action
          cannot be undone.
        </p>

        {deleteTarget && (
          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-sm font-bold capitalize text-slate-900">
              {
                deleteTarget.patient_name
              }
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {
                deleteTarget.appointment_date
              }{" "}
              ·{" "}
              {
                deleteTarget.assigned_slot
              }
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() =>
              setDeleteTarget(null)
            }
          >
            Keep appointment
          </Button>

          <Button
            variant="danger"
            disabled={deleting}
            onClick={() =>
              void confirmDelete()
            }
          >
            {deleting
              ? "Deleting..."
              : "Delete appointment"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

/* =================================================================
   UPCOMING APPOINTMENT CARD
================================================================= */

function UpcomingAppointmentCard({
  appointment,
}: {
  appointment: Appointment;
}) {
  const formattedDate =
    new Date(
      `${appointment.appointment_date}T00:00:00`,
    ).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

  return (
    <div className="group rounded-2xl border border-slate-100 bg-white p-4 transition hover:border-teal-100 hover:bg-teal-50/20">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-[10px] font-bold text-teal-700">
            {getInitials(
              appointment.patient_name,
            )}
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-bold capitalize text-slate-900">
              {
                appointment.patient_name
              }
            </p>

            <p className="mt-0.5 text-xs text-slate-400">
              {formattedDate}
            </p>
          </div>
        </div>

        <StatusBadge
          status={appointment.status}
        />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="text-xs font-bold text-slate-700">
          {appointment.assigned_slot}
        </span>

        <span className="text-[10px] font-semibold text-slate-400">
          {appointment.booking_source}
        </span>
      </div>
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
   SCHEDULE ROW
================================================================= */

function ScheduleRow({
  appointment,
  onComplete,
  onCancel,
}: {
  appointment: Appointment;
  onComplete: () => void;
  onCancel: () => void;
}) {
  const completed =
    appointment.status === "Completed";

  const cancelled =
    appointment.status === "Cancelled" ||
    appointment.status === "No-show";

  return (
    <div className="group flex flex-col gap-3 rounded-xl px-3 py-3 transition hover:bg-slate-50 sm:flex-row sm:items-center">
      <div className="w-20 shrink-0">
        <p className="text-xs font-bold text-slate-700">
          {appointment.assigned_slot}
        </p>
      </div>

      <div className="relative flex shrink-0 items-center justify-center">
        <span
          className={`absolute h-5 w-5 rounded-full ${
            completed
              ? "bg-emerald-50"
              : cancelled
                ? "bg-rose-50"
                : "bg-teal-50"
          }`}
        />

        <span
          className={`relative h-2 w-2 rounded-full ${
            completed
              ? "bg-emerald-500"
              : cancelled
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

      <StatusBadge
        status={appointment.status}
      />

      {!completed && !cancelled && (
        <div className="flex shrink-0 gap-2">
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
            Cancel / no-show
          </Button>
        </div>
      )}
    </div>
  );
}

/* =================================================================
   APPOINTMENT TABLE ROW
================================================================= */

function AppointmentRow({
  appointment,
  onEdit,
  onDelete,
  onComplete,
  onCancel,
}: {
  appointment: Appointment;
  onEdit: () => void;
  onDelete: () => void;
  onComplete: () => void;
  onCancel: () => void;
}) {
  const completed =
    appointment.status === "Completed";

  const cancelled =
    appointment.status === "Cancelled" ||
    appointment.status === "No-show";

  return (
    <tr className="group transition hover:bg-slate-50/70">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-[10px] font-bold text-teal-700">
            {getInitials(
              appointment.patient_name,
            )}
          </div>

          <span className="font-bold capitalize text-slate-900">
            {appointment.patient_name}
          </span>
        </div>
      </td>

      <td className="px-4 py-4 text-slate-500">
        {appointment.phone_number}
      </td>

      <td className="px-4 py-4 text-slate-600">
        {appointment.appointment_date}
      </td>

      <td className="px-4 py-4 font-semibold text-slate-800">
        {appointment.assigned_slot}
      </td>

      <td className="px-4 py-4">
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${
            sourceStyles[
              appointment.booking_source
            ]
          }`}
        >
          {appointment.booking_source}
        </span>
      </td>

      <td className="px-4 py-4">
        <StatusBadge
          status={appointment.status}
        />
      </td>

      <td className="px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          {!completed && !cancelled && (
            <>
              <button
                type="button"
                className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-100"
                onClick={onComplete}
              >
                Complete
              </button>

              <button
                type="button"
                className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-[11px] font-bold text-rose-700 transition hover:bg-rose-100"
                onClick={onCancel}
              >
                Cancel / no-show
              </button>
            </>
          )}

          <button
            type="button"
            className="text-xs font-bold text-teal-700 transition hover:text-teal-900"
            onClick={onEdit}
          >
            Edit
          </button>

          <button
            type="button"
            className="text-xs font-bold text-rose-600 transition hover:text-rose-700"
            onClick={onDelete}
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
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
  const label = displayStatus(status);

  const styles =
    label === "Completed"
      ? "border-emerald-100 bg-emerald-50 text-emerald-700"
      : label === "Cancelled / No-show"
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
   TABLE HEADER
================================================================= */

function Header({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
      {children}
    </th>
  );
}

/* =================================================================
   HELPERS
================================================================= */

function isConfirmed(
  status: AppointmentStatus,
) {
  return (
    status === "Scheduled" ||
    status === "Checked in" ||
    status === "In treatment"
  );
}

function displayStatus(
  status: AppointmentStatus,
) {
  if (status === "Completed") {
    return "Completed";
  }

  if (
    status === "Cancelled" ||
    status === "No-show"
  ) {
    return "Cancelled / No-show";
  }

  return "Confirmed";
}

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

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="10.8"
        cy="10.8"
        r="6.3"
        stroke="currentColor"
        strokeWidth="1.7"
      />

      <path
        d="m16 16 4 4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

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

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 7h14M10 11v6M14 11v6M9 7V4h6v3M7 7l1 13h8l1-13"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}