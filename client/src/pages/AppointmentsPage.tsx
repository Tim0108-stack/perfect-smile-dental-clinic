import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import type {
  Appointment,
  AppointmentStatus,
  Treatment,
} from "@shared/types/index";

import { PageHeader } from "@/components/PageHeader";
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
import { Modal } from "@/components/ui/Modal";

import {
  displayStatusLabel,
  isOverdueToday,
  isTerminalStatus,
  sourceStyles,
} from "@/lib/appointments";
import { localDateString } from "@/lib/date";
import { appointmentApi } from "@/services/appointments";
import { treatmentApi } from "@/services/treatments";
import { useToast } from "@/hooks/useToast";

type DateFilter = "all" | "today" | "week" | "month";

export function AppointmentsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] =
    useState<DateFilter>("all");
  const [treatmentFilter, setTreatmentFilter] =
    useState<string>("all");
  const [treatments, setTreatments] =
    useState<Treatment[]>([]);

  const [deleteTarget, setDeleteTarget] =
    useState<Appointment | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  useEffect(() => {
    void loadAppointments();
  }, []);

  useEffect(() => {
    treatmentApi.list().then(setTreatments).catch(() => setTreatments([]));
  }, []);

  const today = localDateString();

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

      const matchesTreatment =
        treatmentFilter === "all" ||
        (treatmentFilter === "none"
          ? appointment.treatment_id === null ||
            appointment.treatment_id === undefined
          : String(appointment.treatment_id ?? "") === treatmentFilter);

      return matchesSearch && matchesDate && matchesTreatment;
    });
  }, [
    appointments,
    dateFilter,
    search,
    today,
    treatmentFilter,
  ]);

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
      "Appointment marked as cancelled",
    );
  }

  async function markNoShow(
    appointment: Appointment,
  ) {
    await updateStatus(
      appointment,
      "No-show",
      "Appointment marked as no-show",
    );
  }

  async function restoreAppointment(
    appointment: Appointment,
  ) {
    await updateStatus(
      appointment,
      "Scheduled",
      "Appointment restored to scheduled",
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

  return (
    <div className="space-y-7 pb-12">
      <PageHeader
        eyebrow="Clinic operations"
        title="Appointments"
        description="Search, edit, or manage every booking on the books."
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

      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>
                All appointments
              </CardTitle>

              <p className="mt-1 text-xs text-slate-500">
                Search by patient or phone,
                filter by date, and take action
                on any booking.
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
                autoFocus
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

            <select
              value={treatmentFilter}
              onChange={(event) =>
                setTreatmentFilter(
                  event.target.value,
                )
              }
              className="field-control rounded-lg border bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-300 focus:ring-2 focus:ring-teal-100"
            >
              <option value="all">
                All treatments
              </option>

              <option value="none">
                No treatment
              </option>

              {treatments.map((treatment) => (
                <option
                  key={treatment.id}
                  value={String(treatment.id)}
                >
                  {treatment.name}
                </option>
              ))}
            </select>
          </div>

          {error ? (
            <ErrorState
              title="Appointments could not be loaded"
              description={error}
              onRetry={() =>
                void loadAppointments()
              }
            />
          ) : loading ? (
            <LoadingState label="Loading appointments..." />
          ) : visibleAppointments.length ===
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
                      Treatment
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
                        onNoShow={() =>
                          void markNoShow(
                            appointment,
                          )
                        }
                        onRestore={() =>
                          void restoreAppointment(
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
   APPOINTMENT TABLE ROW
================================================================= */

function AppointmentRow({
  appointment,
  onEdit,
  onDelete,
  onComplete,
  onCancel,
  onNoShow,
  onRestore,
}: {
  appointment: Appointment;
  onEdit: () => void;
  onDelete: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onNoShow: () => void;
  onRestore: () => void;
}) {
  const terminal = isTerminalStatus(
    appointment.status,
  );

  const overdue = isOverdueToday(appointment);

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

      <td className="px-4 py-4 text-slate-600">
        {appointment.treatment_name || (
          <span className="text-slate-300">
            Not specified
          </span>
        )}
      </td>

      <td className="px-4 py-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge
            status={appointment.status}
          />

          {overdue && (
            <Badge variant="amber">
              Overdue
            </Badge>
          )}
        </div>
      </td>

      <td className="px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          {!terminal ? (
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
                Cancel
              </button>

              <button
                type="button"
                className="rounded-lg bg-rose-100 px-2.5 py-1.5 text-[11px] font-bold text-rose-800 transition hover:bg-rose-200"
                onClick={onNoShow}
              >
                No-show
              </button>
            </>
          ) : (
            <button
              type="button"
              className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 transition hover:bg-slate-200"
              onClick={onRestore}
            >
              Restore
            </button>
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
