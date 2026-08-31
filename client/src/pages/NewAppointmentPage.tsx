import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { Appointment, Treatment } from "@shared/types/index";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { APPOINTMENT_SLOTS, BOOKING_SOURCES, formatPatientName } from "@/lib/appointments";
import { localDateString } from "@/lib/date";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { appointmentApi, type AppointmentPayload } from "@/services/appointments";
import { treatmentApi } from "@/services/treatments";
import { useToast } from "@/hooks/useToast";

interface FormState { patient_name: string; phone_number: string; appointment_date: string; assigned_slot: string; notes: string; booking_source: Appointment["booking_source"]; treatment_id: string; }
const emptyForm: FormState = { patient_name: "", phone_number: "", appointment_date: localDateString(), assigned_slot: "", notes: "", booking_source: "WhatsApp", treatment_id: "" };

export function NewAppointmentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const editing = (location.state as { appointment?: Appointment } | null)?.appointment;
  const [form, setForm] = useState<FormState>(editing ? fromAppointment(editing) : emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sendConfirmation, setSendConfirmation] = useState(!editing);
  const [treatments, setTreatments] = useState<Treatment[]>([]);

  useEffect(() => { setForm(editing ? fromAppointment(editing) : emptyForm); setSendConfirmation(!editing); }, [editing]);

  useEffect(() => { treatmentApi.list().then(setTreatments).catch(() => setTreatments([])); }, []);

  function updateField(field: keyof FormState, value: string) { setForm((current) => ({ ...current, [field]: value })); }

  function validate(): string | null {
    if (!form.patient_name.trim()) return "Patient name is required";
    if (form.patient_name.trim().length > 50) return "Patient name must be 50 characters or fewer";
    if (!/^\d{10}$/.test(form.phone_number.trim())) return "Please enter a valid 10-digit phone number";
    if (!form.appointment_date) return "Appointment date is required";
    if (form.appointment_date < localDateString()) return "Appointment date cannot be earlier than today";
    if (!form.assigned_slot) return "Assigned slot is required";
    return form.notes.length > 500 ? "Notes must be 500 characters or fewer" : null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setSaving(true); setError(null);
    const payload: AppointmentPayload = { ...form, patient_name: formatPatientName(form.patient_name), phone_number: form.phone_number.trim(), notes: form.notes.trim() || null, treatment_id: form.treatment_id || null };
    try {
      const saved = editing ? await appointmentApi.update(editing.id, payload) : await appointmentApi.create(payload);
      if (!editing && sendConfirmation) {
        const date = new Date(`${saved.appointment_date}T00:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
        const message = `Hello ${saved.patient_name},\n\nYour appointment at *Perfect Smile Dental Clinic* has been confirmed.\n\n*Date:* ${date}\n*Time:* ${saved.assigned_slot}\n\nPlease arrive *10 minutes early*.\n\nThank you,\nPerfect Smile Dental Clinic`;
        window.open(buildWhatsAppUrl(saved.phone_number, message), "_blank");
      }
      showToast(editing ? "Appointment updated successfully" : "Appointment saved successfully", "success");
      navigate("/dashboard");
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Failed to save appointment"); }
    finally { setSaving(false); }
  }

  return <div>
    <PageHeader eyebrow="Clinic operations" title={editing ? "Edit appointment" : "New appointment"} description="Add the patient details and reserve an available time." />
    <Card>
      <CardHeader><CardTitle>Appointment details</CardTitle></CardHeader>
      <CardBody>
        <form className="grid sm:grid-cols-2 gap-4" onSubmit={handleSubmit}>
          <Field label="Patient name"><Input required maxLength={50} value={form.patient_name} onChange={(event) => updateField("patient_name", event.target.value)} /></Field>
          <Field label="Phone number"><Input required maxLength={10} inputMode="numeric" value={form.phone_number} onChange={(event) => updateField("phone_number", event.target.value.replace(/\D/g, ""))} /></Field>
          <Field label="Appointment date"><Input required min={localDateString()} type="date" value={form.appointment_date} onChange={(event) => updateField("appointment_date", event.target.value)} /></Field>
          <Field label="Assigned slot"><Select required value={form.assigned_slot} onChange={(event) => updateField("assigned_slot", event.target.value)}><option value="">Select time slot</option>{APPOINTMENT_SLOTS.map((slot) => <option key={slot}>{slot}</option>)}</Select></Field>
          <Field label="Booking source"><Select required value={form.booking_source} onChange={(event) => updateField("booking_source", event.target.value)}>{BOOKING_SOURCES.map((source) => <option key={source}>{source}</option>)}</Select></Field>
          <Field label="Treatment"><Select value={form.treatment_id} onChange={(event) => updateField("treatment_id", event.target.value)}><option value="">No treatment selected</option>{treatments.map((treatment) => <option key={treatment.id} value={treatment.id}>{treatment.name}</option>)}</Select></Field>
          <Field label="Notes" className="sm:col-span-2"><Textarea maxLength={500} rows={3} value={form.notes} onChange={(event) => updateField("notes", event.target.value)} /></Field>
          {error && <div className="sm:col-span-2"><ErrorState title="Unable to save appointment" description={error} /></div>}
          {!editing && <label className="sm:col-span-2 flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={sendConfirmation} onChange={(event) => setSendConfirmation(event.target.checked)} /> Open WhatsApp confirmation after saving</label>}
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2"><Button type="button" variant="secondary" onClick={() => navigate("/dashboard")}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving..." : editing ? "Update appointment" : "Save appointment"}</Button></div>
        </form>
      </CardBody>
    </Card>
  </div>;
}

function fromAppointment(appointment: Appointment): FormState { return { patient_name: appointment.patient_name, phone_number: appointment.phone_number, appointment_date: appointment.appointment_date, assigned_slot: appointment.assigned_slot, notes: appointment.notes || "", booking_source: appointment.booking_source, treatment_id: appointment.treatment_id === null || appointment.treatment_id === undefined ? "" : String(appointment.treatment_id) }; }
function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) { return <div className={className}><label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">{label}</label>{children}</div>; }