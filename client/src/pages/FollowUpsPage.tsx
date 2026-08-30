import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { Appointment, FollowUp } from "@shared/types/index";

import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Modal } from "@/components/ui/Modal";

import {
  APPOINTMENT_SLOTS,
  getInitials,
} from "@/lib/appointments";
import {
  addDays,
  localDateString,
  parseAppointmentDate,
} from "@/lib/date";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { appointmentApi } from "@/services/appointments";
import {
  followUpApi,
  type FollowUpPayload,
} from "@/services/followUps";
import { useToast } from "@/hooks/useToast";

type Filter =
  | "open"
  | "today"
  | "upcoming"
  | "overdue"
  | "completed";

type FormState = {
  appointment_id: string;
  follow_up_date: string;
  time_slot: string;
  notes: string;
};

const initialForm: FormState = {
  appointment_id: "",
  follow_up_date: localDateString(
    addDays(new Date(), 7),
  ),
  time_slot: "",
  notes: "",
};

function timing(
  item: FollowUp,
): Exclude<Filter, "open"> {
  const today = localDateString();

  if (item.status === "Completed") {
    return "completed";
  }

  if (item.follow_up_date < today) {
    return "overdue";
  }

  if (item.follow_up_date === today) {
    return "today";
  }

  return "upcoming";
}

export function FollowUpsPage() {
  const { showToast } = useToast();

  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState<Filter>("open");

  const [form, setForm] =
    useState<FormState>(initialForm);

  const [editing, setEditing] =
    useState<FollowUp | null>(null);

  const [createOpen, setCreateOpen] = useState(false);

  const [deleteTarget, setDeleteTarget] =
    useState<FollowUp | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const [
        loadedFollowUps,
        loadedAppointments,
      ] = await Promise.all([
        followUpApi.list(),
        appointmentApi.list(),
      ]);

      setFollowUps(loadedFollowUps);
      setAppointments(loadedAppointments);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load follow-ups",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const open = followUps.filter(
    (item) => item.status !== "Completed",
  );

  const dueToday = open.filter(
    (item) => timing(item) === "today",
  );

  const upcoming = open.filter(
    (item) => timing(item) === "upcoming",
  );

  const overdue = open.filter(
    (item) => timing(item) === "overdue",
  );

  const completed = followUps.filter(
    (item) => item.status === "Completed",
  );

  const filtered = useMemo(() => {
    return followUps
      .filter((item) => {
        if (filter === "open") {
          return item.status !== "Completed";
        }

        return timing(item) === filter;
      })
      .sort((a, b) => {
        if (filter === "overdue") {
          return b.follow_up_date.localeCompare(
            a.follow_up_date,
          );
        }

        return a.follow_up_date.localeCompare(
          b.follow_up_date,
        );
      });
  }, [filter, followUps]);

  function openCreate() {
    setEditing(null);
    setCreateOpen(true);
    setForm({
      ...initialForm,
      follow_up_date: localDateString(
        addDays(new Date(), 7),
      ),
    });
  }

  function openEdit(item: FollowUp) {
    setCreateOpen(false);
    setEditing(item);

    setForm({
      appointment_id: String(item.appointment_id),
      follow_up_date: item.follow_up_date,
      time_slot: item.time_slot || "",
      notes: item.notes || "",
    });
  }

  function closeForm() {
    setEditing(null);
    setCreateOpen(false);
    setForm(initialForm);
  }

  function setFormField(
    field: keyof FormState,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function save(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const appointment = appointments.find(
      (item) =>
        String(item.id) === form.appointment_id,
    );

    if (!editing && !appointment) {
      showToast(
        "Select an appointment",
        "error",
      );
      return;
    }

    if (
      !form.follow_up_date ||
      form.follow_up_date < localDateString()
    ) {
      showToast(
        "Choose a valid follow-up date",
        "error",
      );
      return;
    }

    setSaving(true);

    const payload: FollowUpPayload = {
      appointment_id:
        editing?.appointment_id ??
        appointment!.id,

      patient_name:
        editing?.patient_name ??
        appointment!.patient_name,

      phone_number:
        editing?.phone_number ??
        appointment!.phone_number,

      follow_up_date:
        form.follow_up_date,

      time_slot:
        form.time_slot || null,

      notes:
        form.notes.trim() || null,

      status:
        editing?.status ?? "Open",
    };

    try {
      const saved = editing
        ? await followUpApi.update(
            editing.id,
            payload,
          )
        : await followUpApi.create(payload);

      setFollowUps((current) =>
        editing
          ? current.map((item) =>
              item.id === saved.id
                ? saved
                : item,
            )
          : [...current, saved],
      );

      closeForm();

      showToast(
        editing
          ? "Follow-up updated successfully"
          : "Follow-up added successfully",
        "success",
      );
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "Failed to save follow-up",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function complete(item: FollowUp) {
    try {
      const saved =
        await followUpApi.complete(item.id);

      setFollowUps((current) =>
        current.map((entry) =>
          entry.id === saved.id
            ? saved
            : entry,
        ),
      );

      showToast(
        "Follow-up marked as completed",
        "success",
      );
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "Failed to complete follow-up",
        "error",
      );
    }
  }

  async function remove() {
    if (!deleteTarget) return;

    try {
      await followUpApi.remove(
        deleteTarget.id,
      );

      setFollowUps((current) =>
        current.filter(
          (item) =>
            item.id !== deleteTarget.id,
        ),
      );

      setDeleteTarget(null);

      showToast(
        "Follow-up deleted successfully",
        "success",
      );
    } catch (requestError) {
      showToast(
        requestError instanceof Error
          ? requestError.message
          : "Failed to delete follow-up",
        "error",
      );
    }
  }

  const activeFilterLabel =
    filter === "open"
      ? "Open follow-ups"
      : filter === "today"
        ? "Due today"
        : filter === "upcoming"
          ? "Upcoming"
          : filter === "overdue"
            ? "Overdue"
            : "Completed";

  return (
    <div className="space-y-7 pb-12">
      <PageHeader
        eyebrow="Patient care"
        title="Follow-ups"
        description="Keep every treatment follow-up visible, timely, and easy to act on."
        action={
          <Button onClick={openCreate}>
            + Add follow-up
          </Button>
        }
      />

      {loading ? (
        <Card>
          <LoadingState label="Loading follow-ups..." />
        </Card>
      ) : error ? (
        <Card>
          <ErrorState
            title="Follow-ups could not be loaded"
            description={error}
            onRetry={() => void loadData()}
          />
        </Card>
      ) : (
        <>
          {/* ---------------------------------------------------------------- */}
          {/* Care overview                                                     */}
          {/* ---------------------------------------------------------------- */}

          <section className="relative overflow-hidden rounded-[24px] border border-teal-100 bg-gradient-to-br from-white via-white to-teal-50/80 shadow-[0_20px_60px_-35px_rgba(15,118,110,0.35)]">
            <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-teal-200/25 blur-3xl" />

            <div className="relative grid gap-7 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:p-9">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal-100 bg-white/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-teal-700 shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                  Patient care queue
                </div>

                <h2 className="text-3xl font-bold tracking-[-0.04em] text-slate-950 sm:text-4xl">
                  Stay ahead of every follow-up.
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                  Keep upcoming care visible, act on overdue
                  patients quickly, and close the loop when
                  treatment is complete.
                </p>

                <div className="mt-7 flex flex-wrap gap-2">
                  <OverviewPill
                    label="Open"
                    value={open.length}
                  />

                  <OverviewPill
                    label="Due today"
                    value={dueToday.length}
                  />

                  <OverviewPill
                    label="Overdue"
                    value={overdue.length}
                  />

                  <OverviewPill
                    label="Completed"
                    value={completed.length}
                  />
                </div>
              </div>

              <div className="flex items-center justify-center lg:justify-end">
                <div className="relative flex h-32 w-32 items-center justify-center rounded-full border border-teal-100 bg-white shadow-[0_15px_40px_-25px_rgba(15,118,110,0.6)]">
                  <div className="absolute inset-2 rounded-full border border-dashed border-teal-100" />

                  <div className="text-center">
                    <p className="text-3xl font-bold tracking-tight text-teal-700">
                      {open.length}
                    </p>

                    <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      Active
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ---------------------------------------------------------------- */}
          {/* Statistics                                                        */}
          {/* ---------------------------------------------------------------- */}

          <section>
            <div className="mb-3">
              <h2 className="text-base font-bold tracking-tight text-slate-950">
                Follow-up health
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                A quick view of your patient-care workload.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
              <StatCard
                label="Open follow-ups"
                value={open.length}
                detail="Active care items"
                tone="teal"
                icon={<ClipboardIcon />}
              />

              <StatCard
                label="Due today"
                value={dueToday.length}
                detail="Needs attention"
                tone="blue"
                icon={<TodayIcon />}
              />

              <StatCard
                label="Upcoming"
                value={upcoming.length}
                detail="Future care"
                tone="amber"
                icon={<CalendarIcon />}
              />

              <StatCard
                label="Overdue"
                value={overdue.length}
                detail={
                  overdue.length
                    ? "Needs follow-up"
                    : "Queue is clear"
                }
                tone="rose"
                icon={<AlertIcon />}
              />
            </div>
          </section>

          {/* ---------------------------------------------------------------- */}
          {/* Main queue                                                        */}
          {/* ---------------------------------------------------------------- */}

          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 bg-white p-5 sm:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-teal-500" />

                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-teal-700">
                      Care queue
                    </p>
                  </div>

                  <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
                    {activeFilterLabel}
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    {filtered.length}{" "}
                    {filtered.length === 1
                      ? "patient"
                      : "patients"}{" "}
                    in this view.
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 rounded-xl bg-slate-100 p-1">
                  <FilterButton
                    active={filter === "open"}
                    label="Open"
                    count={open.length}
                    onClick={() =>
                      setFilter("open")
                    }
                  />

                  <FilterButton
                    active={filter === "today"}
                    label="Today"
                    count={dueToday.length}
                    onClick={() =>
                      setFilter("today")
                    }
                  />

                  <FilterButton
                    active={filter === "upcoming"}
                    label="Upcoming"
                    count={upcoming.length}
                    onClick={() =>
                      setFilter("upcoming")
                    }
                  />

                  <FilterButton
                    active={filter === "overdue"}
                    label="Overdue"
                    count={overdue.length}
                    onClick={() =>
                      setFilter("overdue")
                    }
                  />

                  <FilterButton
                    active={filter === "completed"}
                    label="Completed"
                    count={completed.length}
                    onClick={() =>
                      setFilter("completed")
                    }
                  />
                </div>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="No follow-ups match this view"
                  description={
                    filter === "overdue"
                      ? "Your overdue queue is clear."
                      : "There are no follow-ups to show here."
                  }
                />
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filtered.map((item) => (
                  <FollowUpRow
                    key={item.id}
                    item={item}
                    onEdit={() =>
                      openEdit(item)
                    }
                    onComplete={() =>
                      void complete(item)
                    }
                    onDelete={() =>
                      setDeleteTarget(item)
                    }
                  />
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* Create / edit modal                                                   */}
      {/* -------------------------------------------------------------------- */}

      <Modal
        open={Boolean(editing) || createOpen}
        onClose={closeForm}
        title={
          editing
            ? "Edit follow-up"
            : "Plan patient follow-up"
        }
      >
        <form
          onSubmit={save}
          className="space-y-5"
        >
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Appointment
            </label>

            <select
              required
              disabled={Boolean(editing)}
              value={form.appointment_id}
              onChange={(event) =>
                setFormField(
                  "appointment_id",
                  event.target.value,
                )
              }
              className="field-control w-full rounded-xl border px-3 py-3 text-sm"
            >
              <option value="">
                Select appointment
              </option>

              {appointments.map(
                (appointment) => (
                  <option
                    key={appointment.id}
                    value={appointment.id}
                  >
                    {appointment.patient_name} ·{" "}
                    {appointment.appointment_date} ·{" "}
                    {appointment.assigned_slot}
                  </option>
                ),
              )}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Follow-up date
              </label>

              <input
                required
                type="date"
                min={localDateString()}
                value={form.follow_up_date}
                onChange={(event) =>
                  setFormField(
                    "follow_up_date",
                    event.target.value,
                  )
                }
                className="field-control w-full rounded-xl border px-3 py-3 text-sm"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Time slot
              </label>

              <select
                required
                value={form.time_slot}
                onChange={(event) =>
                  setFormField(
                    "time_slot",
                    event.target.value,
                  )
                }
                className="field-control w-full rounded-xl border px-3 py-3 text-sm"
              >
                <option value="">
                  Select time slot
                </option>

                {APPOINTMENT_SLOTS.map(
                  (slot) => (
                    <option key={slot}>
                      {slot}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Notes
              </label>

              <span className="text-[10px] text-slate-400">
                {form.notes.length}/500
              </span>
            </div>

            <textarea
              maxLength={500}
              rows={4}
              value={form.notes}
              onChange={(event) =>
                setFormField(
                  "notes",
                  event.target.value,
                )
              }
              placeholder="Add treatment context or a reminder for the team..."
              className="field-control w-full resize-none rounded-xl border px-3 py-3 text-sm"
            />
          </div>

          <div className="rounded-xl border border-teal-100 bg-teal-50/60 p-4">
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-teal-600 shadow-sm">
                <InfoIcon />
              </div>

              <div>
                <p className="text-xs font-bold text-teal-900">
                  Patient-care reminder
                </p>

                <p className="mt-1 text-xs leading-5 text-teal-700/80">
                  Follow-ups stay visible until the team
                  marks them completed.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <Button
              type="button"
              variant="secondary"
              onClick={closeForm}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : editing
                  ? "Save changes"
                  : "Add follow-up"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* -------------------------------------------------------------------- */}
      {/* Delete modal                                                          */}
      {/* -------------------------------------------------------------------- */}

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() =>
          setDeleteTarget(null)
        }
        title="Delete follow-up"
      >
        <div className="space-y-4">
          <p className="text-sm leading-6 text-slate-500">
            Delete this follow-up record? This action
            cannot be undone.
          </p>

          {deleteTarget && (
            <div className="flex items-center gap-3 rounded-xl border border-rose-100 bg-rose-50/60 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-xs font-bold text-rose-700 shadow-sm">
                {getInitials(
                  deleteTarget.patient_name,
                )}
              </div>

              <div>
                <p className="text-sm font-bold capitalize text-slate-900">
                  {deleteTarget.patient_name}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {deleteTarget.follow_up_date}
                  {deleteTarget.time_slot
                    ? ` · ${deleteTarget.time_slot}`
                    : ""}
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() =>
                setDeleteTarget(null)
              }
            >
              Cancel
            </Button>

            <Button
              variant="danger"
              onClick={() => void remove()}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Follow-up row                                                               */
/* -------------------------------------------------------------------------- */

function FollowUpRow({
  item,
  onEdit,
  onComplete,
  onDelete,
}: {
  item: FollowUp;
  onEdit: () => void;
  onComplete: () => void;
  onDelete: () => void;
}) {
  const state = timing(item);

  const date =
    parseAppointmentDate(
      item.follow_up_date,
    ).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const weekday =
    parseAppointmentDate(
      item.follow_up_date,
    ).toLocaleDateString("en-US", {
      weekday: "short",
    });

  const message = `Hello ${item.patient_name},

This is a follow-up reminder from Perfect Smile Dental Clinic.

Your follow-up is scheduled for ${date}${
    item.time_slot
      ? ` at ${item.time_slot}`
      : ""
  }.

Please call us to confirm your appointment.

Thank you,
Perfect Smile Dental Clinic`;

  const isOverdue = state === "overdue";
  const isCompleted = state === "completed";
  const isToday = state === "today";

  return (
    <article
      className={`group relative px-5 py-5 transition-colors sm:px-6 ${
        isOverdue
          ? "bg-rose-50/25 hover:bg-rose-50/50"
          : "hover:bg-slate-50/70"
      }`}
    >
      {isOverdue && (
        <span className="absolute inset-y-0 left-0 w-0.5 bg-rose-400" />
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="flex min-w-0 gap-4">
          {/* Date */}
          <div
            className={`hidden h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl border sm:flex ${
              isOverdue
                ? "border-rose-100 bg-rose-50 text-rose-700"
                : isToday
                  ? "border-blue-100 bg-blue-50 text-blue-700"
                  : isCompleted
                    ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-slate-50 text-slate-600"
            }`}
          >
            <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">
              {weekday}
            </span>

            <span className="mt-0.5 text-base font-bold">
              {parseAppointmentDate(
                item.follow_up_date,
              ).getDate()}
            </span>
          </div>

          {/* Patient */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-50 text-xs font-bold text-teal-700 sm:hidden">
                {getInitials(
                  item.patient_name,
                )}
              </div>

              <h3 className="truncate text-sm font-bold capitalize text-slate-950">
                {item.patient_name}
              </h3>

              <Badge
                variant={
                  isOverdue
                    ? "rose"
                    : isCompleted
                      ? "teal"
                      : isToday
                        ? "blue"
                        : "amber"
                }
              >
                {isToday
                  ? "Due today"
                  : state === "completed"
                    ? "Completed"
                    : state[0].toUpperCase() +
                      state.slice(1)}
              </Badge>
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              <span>
                {date}
              </span>

              {item.time_slot && (
                <>
                  <span className="text-slate-300">
                    ·
                  </span>

                  <span className="font-medium text-slate-600">
                    {item.time_slot}
                  </span>
                </>
              )}

              <span className="text-slate-300">
                ·
              </span>

              <span>
                {item.phone_number}
              </span>
            </div>

            {item.notes && (
              <div className="mt-3 flex gap-2 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                <span className="mt-0.5 text-slate-400">
                  <NoteIcon />
                </span>

                <p className="line-clamp-2 text-xs leading-5 text-slate-500">
                  {item.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <a
            href={buildWhatsAppUrl(
              item.phone_number,
              message,
            )}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs font-bold text-green-700 transition hover:border-green-300 hover:bg-green-100"
          >
            <WhatsAppIcon />
            WhatsApp
          </a>

          {!isCompleted && (
            <button
              type="button"
              onClick={onComplete}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
            >
              <CheckIcon />
              Complete
            </button>
          )}

          <button
            type="button"
            onClick={onEdit}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
          >
            Edit
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="rounded-xl border border-transparent px-2 py-2 text-xs font-bold text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
            aria-label={`Delete follow-up for ${item.patient_name}`}
          >
            <TrashIcon />
          </button>
        </div>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/* UI helpers                                                                  */
/* -------------------------------------------------------------------------- */

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

type StatTone =
  | "teal"
  | "blue"
  | "amber"
  | "rose";

function StatCard({
  label,
  value,
  detail,
  tone,
  icon,
}: {
  label: string;
  value: number;
  detail: string;
  tone: StatTone;
  icon: React.ReactNode;
}) {
  const tones: Record<
    StatTone,
    {
      icon: string;
      value: string;
      line: string;
    }
  > = {
    teal: {
      icon:
        "border-teal-100 bg-teal-50 text-teal-600",
      value: "text-teal-700",
      line: "bg-teal-400",
    },
    blue: {
      icon:
        "border-blue-100 bg-blue-50 text-blue-600",
      value: "text-blue-700",
      line: "bg-blue-400",
    },
    amber: {
      icon:
        "border-amber-100 bg-amber-50 text-amber-600",
      value: "text-amber-700",
      line: "bg-amber-400",
    },
    rose: {
      icon:
        "border-rose-100 bg-rose-50 text-rose-600",
      value: "text-rose-700",
      line: "bg-rose-400",
    },
  };

  const styles = tones[tone];

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_12px_35px_-28px_rgba(15,23,42,0.5)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-25px_rgba(15,23,42,0.25)]">
      <span
        className={`absolute inset-x-0 bottom-0 h-0.5 opacity-0 transition group-hover:opacity-100 ${styles.line}`}
      />

      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl border ${styles.icon}`}
      >
        {icon}
      </div>

      <p
        className={`mt-6 text-3xl font-bold tracking-[-0.04em] ${styles.value}`}
      >
        {value}
      </p>

      <p className="mt-1 text-sm font-bold text-slate-900">
        {label}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {detail}
      </p>
    </div>
  );
}

function FilterButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-[11px] font-bold transition ${
        active
          ? "bg-white text-teal-700 shadow-sm"
          : "text-slate-500 hover:bg-white/60 hover:text-slate-700"
      }`}
    >
      {label}
      <span
        className={`ml-1.5 ${
          active
            ? "text-teal-500"
            : "text-slate-400"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Icons                                                                       */
/* -------------------------------------------------------------------------- */

function ClipboardIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect
        x="5"
        y="4"
        width="14"
        height="17"
        rx="2.5"
      />
      <path d="M9 4V2.75h6V4M9 9h6M9 13h6M9 17h4" />
    </svg>
  );
}

function TodayIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v4.8l3 2" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect
        x="3.5"
        y="4.5"
        width="17"
        height="16"
        rx="3"
      />
      <path d="M8 2.75v3.5M16 2.75v3.5M3.5 9h17" />
      <path d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 3.5 21 20H3L12 3.5Z" />
      <path d="M12 9v5M12 17h.01" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 10.5v5M12 7.5h.01" />
    </svg>
  );
}

function NoteIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M5 4.5h14v15H5z" />
      <path d="M8.5 9h7M8.5 13h7M8.5 17h4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M5 7h14M9 7V4h6v3M8 7l1 13h6l1-13M10 11v5M14 11v5" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4A8 8 0 1 1 20 11.5Z" />
      <path d="M9 8.5c.3-.3.7-.2.9.2l.8 1.3c.2.3.1.6-.1.8l-.5.5c.5 1 1.3 1.8 2.4 2.3l.5-.5c.2-.2.5-.3.8-.1l1.3.7c.4.2.5.6.2.9-.4.5-1 .8-1.6.7-2.7-.5-5-2.8-5.5-5.5-.1-.5.2-1.1.8-1.3Z" />
    </svg>
  );
}