-- Add an optional treatment relationship to appointments.
--
-- Nullable, with ON DELETE SET NULL, so this never damages existing
-- appointment data: every current row simply gets treatment_id = NULL
-- until staff pick a treatment, and removing a treatment record later
-- (not something the app does today) would clear the reference rather
-- than delete the appointment.

alter table appointments
  add column if not exists treatment_id bigint references treatments(id) on delete set null;

create index if not exists appointments_treatment_id_idx on appointments (treatment_id);
