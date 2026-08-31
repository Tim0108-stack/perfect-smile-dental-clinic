import { useCallback, useEffect, useState } from "react";
import type { BookingSource, ReportAppointment, Treatment } from "@shared/types/index";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Select } from "@/components/ui/Select";
import { computeStatusCounts } from "@/lib/appointments";
import { localDateString } from "@/lib/date";
import { appointmentApi } from "@/services/appointments";
import { treatmentApi } from "@/services/treatments";

type Period = "today" | "week" | "month" | "custom";

const sources: BookingSource[] = [
  "WhatsApp",
  "Phone Call",
  "Walk-in",
];

function periodRange(
  period: Period,
  customStart: string,
  customEnd: string,
) {
  const today = new Date();
  const todayString = localDateString(today);

  if (period === "today") {
    return {
      start: todayString,
      end: todayString,
      label: "Today",
    };
  }

  if (period === "custom") {
    return {
      start: customStart,
      end: customEnd,
      label:
        customStart && customEnd
          ? `${customStart} to ${customEnd}`
          : "Custom range",
    };
  }

  if (period === "month") {
    return {
      start: localDateString(
        new Date(today.getFullYear(), today.getMonth(), 1),
      ),
      end: localDateString(
        new Date(today.getFullYear(), today.getMonth() + 1, 0),
      ),
      label: today.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
    };
  }

  const start = new Date(today);
  const day = start.getDay();

  start.setDate(
    start.getDate() - (day === 0 ? 6 : day - 1),
  );

  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  return {
    start: localDateString(start),
    end: localDateString(end),
    label: "This week",
  };
}

export function ReportsPage() {
  const [period, setPeriod] = useState<Period>("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const [records, setRecords] = useState<ReportAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [treatments, setTreatments] = useState<Treatment[]>([]);

  useEffect(() => {
    treatmentApi.list().then(setTreatments).catch(() => setTreatments([]));
  }, []);

  const range = periodRange(
    period,
    customStart,
    customEnd,
  );

  const customRangeInvalid =
    period === "custom" &&
    (!customStart ||
      !customEnd ||
      customStart > customEnd);

  const loadReport = useCallback(async () => {
    if (customRangeInvalid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const report = await appointmentApi.report(
        range.start,
        range.end,
      );

      setRecords(report);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load report",
      );
    } finally {
      setLoading(false);
    }
  }, [
    customRangeInvalid,
    range.end,
    range.start,
  ]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  /*
   * The report intentionally focuses on outcomes rather
   * than internal appointment workflow states.
   *
   * Bookings = every appointment record in the period.
   * Completed = appointments that actually happened.
   * Cancelled / no-show = appointments that did not happen.
   *
   * Uses the same shared status-tally logic as Dashboard and
   * Calendar so these definitions can't drift apart.
   */
  const stats = computeStatusCounts(records);
  const bookings = stats.total;
  const completed = stats.completed;
  const cancelledOrNoShow = stats.cancelledOrNoShow;

  const completionRate =
    bookings > 0
      ? Math.round((completed / bookings) * 100)
      : 0;

  const lostAppointmentRate =
    bookings > 0
      ? Math.round(
          (cancelledOrNoShow / bookings) * 100,
        )
      : 0;

  /*
   * Treatment breakdown reuses the real treatments catalog (not a
   * hardcoded list) so counts stay in sync with whatever the clinic
   * has seeded, including any treatments added after this shipped.
   */
  const treatmentBreakdownValues: [string, number][] = treatments.map(
    (treatment) => [
      treatment.name,
      records.filter((record) => record.treatment_name === treatment.name)
        .length,
    ],
  );

  const untreatedCount = records.filter(
    (record) => !record.treatment_name,
  ).length;

  if (untreatedCount > 0) {
    treatmentBreakdownValues.push(["Not specified", untreatedCount]);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Clinic performance"
        title="Appointment reports"
        description={range.label}
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => exportCsv(records)}
              disabled={loading || !records.length}
            >
              Export CSV
            </Button>

            <Button
              variant="secondary"
              onClick={() => void loadReport()}
              disabled={loading}
            >
              Refresh
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Reporting period</CardTitle>

            <p className="mt-1 text-xs text-slate-500">
              See how many appointments were booked,
              completed, cancelled, or missed.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Select
              aria-label="Reporting period"
              value={period}
              onChange={(event) =>
                setPeriod(
                  event.target.value as Period,
                )
              }
              className="h-10 sm:w-40"
            >
              <option value="today">Today</option>
              <option value="week">This week</option>
              <option value="month">This month</option>
              <option value="custom">
                Custom range
              </option>
            </Select>

            {period === "custom" && (
              <>
                <label className="text-xs text-slate-500">
                  From

                  <input
                    aria-label="Report start date"
                    type="date"
                    value={customStart}
                    onChange={(event) =>
                      setCustomStart(
                        event.target.value,
                      )
                    }
                    className="field-control mt-1 block rounded-lg border px-3 py-2 text-sm"
                  />
                </label>

                <label className="text-xs text-slate-500">
                  To

                  <input
                    aria-label="Report end date"
                    type="date"
                    value={customEnd}
                    onChange={(event) =>
                      setCustomEnd(
                        event.target.value,
                      )
                    }
                    className="field-control mt-1 block rounded-lg border px-3 py-2 text-sm"
                  />
                </label>
              </>
            )}
          </div>
        </CardHeader>

        {loading ? (
          <LoadingState label="Preparing clinic report..." />
        ) : error ? (
          <ErrorState
            title="The report could not be loaded"
            description={error}
            onRetry={() => void loadReport()}
          />
        ) : customRangeInvalid ? (
          <CardBody>
            <EmptyState
              title="Choose a valid custom range"
              description="Select both dates, with the start date before the end date."
            />
          </CardBody>
        ) : bookings === 0 ? (
          <CardBody>
            <EmptyState
              title="No appointments were recorded for this period."
              description="Try another reporting period."
            />
          </CardBody>
        ) : (
          <CardBody>
            {/* Primary clinic outcomes */}
            <section>
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">
                  Clinic outcomes
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  The numbers that matter most to
                  your clinic.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <OutcomeCard
                  label="Bookings"
                  value={bookings}
                  description="Appointments booked"
                  variant="slate"
                />

                <OutcomeCard
                  label="Completed"
                  value={completed}
                  description="Appointments completed"
                  variant="teal"
                />

                <OutcomeCard
                  label="Cancelled / No-show"
                  value={cancelledOrNoShow}
                  description="Appointments that did not happen"
                  variant="rose"
                />
              </div>
            </section>

            {/* Useful performance indicators */}
            <section className="mt-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <PerformanceCard
                  title="Completion rate"
                  value={`${completionRate}%`}
                  description="Bookings that resulted in a completed visit."
                  percentage={completionRate}
                  variant="teal"
                />

                <PerformanceCard
                  title="Cancelled / no-show rate"
                  value={`${lostAppointmentRate}%`}
                  description="Bookings that did not result in a visit."
                  percentage={lostAppointmentRate}
                  variant="rose"
                />
              </div>
            </section>

            {/* Booking channels */}
            <section className="mt-6">
              <Breakdown
                title="Where bookings come from"
                description="The channels patients use to book appointments."
                values={sources.map((source) => [
                  source,
                  records.filter(
                    (record) =>
                      record.booking_source === source,
                  ).length,
                ])}
                total={bookings}
              />
            </section>

            {/* Treatments */}
            {treatmentBreakdownValues.length > 0 && (
              <section className="mt-6">
                <Breakdown
                  title="Treatments this period"
                  description="What patients were booked in for, from the clinic's treatment catalog."
                  values={treatmentBreakdownValues}
                  total={bookings}
                />
              </section>
            )}
          </CardBody>
        )}
      </Card>
    </div>
  );
}

function OutcomeCard({
  label,
  value,
  description,
  variant,
}: {
  label: string;
  value: number;
  description: string;
  variant: "slate" | "teal" | "rose";
}) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <Badge variant={variant}>
          {label}
        </Badge>
      </div>

      <p className="mt-5 font-display text-4xl font-bold tracking-tight text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-sm text-slate-500">
        {description}
      </p>
    </div>
  );
}

function PerformanceCard({
  title,
  value,
  description,
  percentage,
  variant,
}: {
  title: string;
  value: string;
  description: string;
  percentage: number;
  variant: "teal" | "rose";
}) {
  const barClass =
    variant === "teal"
      ? "bg-teal-500"
      : "bg-rose-500";

  const textClass =
    variant === "teal"
      ? "text-teal-700"
      : "text-rose-600";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            {title}
          </h3>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </p>
        </div>

        <span
          className={`font-display text-2xl font-bold ${textClass}`}
        >
          {value}
        </span>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barClass}`}
          style={{
            width: `${Math.min(
              Math.max(percentage, 0),
              100,
            )}%`,
          }}
        />
      </div>
    </div>
  );
}

function Breakdown({
  title,
  description,
  values,
  total,
}: {
  title: string;
  description: string;
  values: [string, number][];
  total: number;
}) {
  const max = Math.max(
    ...values.map(([, value]) => value),
    1,
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-5">
        <h3 className="text-base font-semibold text-slate-900">
          {title}
        </h3>

        <p className="mt-1 text-xs text-slate-500">
          {description}
        </p>
      </div>

      <div className="space-y-4">
        {values.map(([label, value]) => {
          const percentage =
            total > 0
              ? Math.round((value / total) * 100)
              : 0;

          return (
            <div key={label}>
              <div className="mb-1.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />

                  <span className="text-sm text-slate-700">
                    {label}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">
                    {percentage}%
                  </span>

                  <span className="min-w-5 text-right text-xs font-semibold text-slate-800">
                    {value}
                  </span>
                </div>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-teal-500 transition-all duration-500"
                  style={{
                    width: `${(value / max) * 100}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function exportCsv(records: ReportAppointment[]) {
  const headers = [
    "Patient Name",
    "Phone Number",
    "Date",
    "Assigned Slot",
    "Status",
    "Booking Source",
    "Treatment",
  ];

  const escape = (value: string) =>
    `"${value.replace(/"/g, '""')}"`;

  const rows = records.map((record) =>
    [
      record.patient_name,
      record.phone_number,
      record.appointment_date,
      record.assigned_slot,
      record.status,
      record.booking_source,
      record.treatment_name || "",
    ]
      .map(escape)
      .join(","),
  );

  const blob = new Blob(
    [[headers.join(","), ...rows].join("\n")],
    {
      type: "text/csv;charset=utf-8;",
    },
  );

  const link = document.createElement("a");

  link.href = URL.createObjectURL(blob);
  link.download = `appointments-${localDateString()}.csv`;

  link.click();

  URL.revokeObjectURL(link.href);
}