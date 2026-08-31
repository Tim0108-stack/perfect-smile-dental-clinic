---
name: perfect-smile
description: Development rules and architecture for the Perfect Smile clinic management application. Use this skill whenever modifying, debugging, reviewing, or extending Perfect Smile.
---

# Perfect Smile Development Skill

## Project

Perfect Smile is a clinic workspace application for managing:

- Patients
- Appointments
- Calendar
- Follow-ups
- Reports
- Clinic operations
- AI-assisted clinic workflows

The application uses a React frontend and Express backend with Supabase for authentication and data.

## Core development principles

Before changing code:

1. Inspect the existing implementation.
2. Understand the current workflow before proposing changes.
3. Reuse existing services, helpers, types, and API endpoints.
4. Do not introduce duplicate business logic.
5. Do not change the database/backend unless genuinely necessary.
6. Do not fabricate data or fields that do not exist.
7. Preserve existing working functionality.
8. Prefer the smallest coherent architectural change.

## Appointment workflow

Appointment status and workflow logic must remain consistent across:

- Dashboard
- Appointments
- Calendar
- Reports
- AI Assistant

Use the shared appointment helpers as the source of truth.

The primary active workflow is:

Today's schedule
→ Focus appointment
→ Complete / Cancel / No-show
→ Automatically advance to the next appropriate appointment

### Focus appointment rules

An overdue unresolved appointment should take priority.

Otherwise select the earliest upcoming confirmed appointment.

Manual selection should override automatic focus until the selected appointment is resolved.

After Complete, Cancel, or No-show:

- clear the manual focus
- automatically select the next appropriate appointment

Restore should return a resolved appointment to its scheduled/confirmed workflow.

Do not create competing appointment-selection logic in individual pages.

## Dashboard UX

The Dashboard should prioritize operational workflow rather than displaying every possible action.

Avoid:

- duplicate CTAs
- repeated appointment information
- unnecessary management controls
- multiple competing versions of the same appointment list

The preferred pattern is:

- compact Today's schedule queue
- focused appointment/action panel
- automatic progression
- clear status/overdue state

Detailed search, filtering, editing, deletion, and appointment management belong on the Appointments page.

Calendar is for calendar-oriented viewing and appointment details.

## Data integrity

Never invent:

- patient fields
- appointment fields
- appointment types
- treatment types
- database columns
- API responses

Before using a field, verify that it exists in the actual data model.

If requested UI information does not exist in the data model:

1. Do not fabricate it.
2. Check whether an existing field can legitimately represent it.
3. If not, explain that a schema change would be required before implementing it.

## Supabase

Respect existing Supabase authentication and RLS.

Never bypass authentication or RLS merely to make a feature work.

Use the authenticated user's session/token for user-scoped operations.

Do not create test users or modify production/live authentication data without explicit approval.

## AI Assistant

The Perfect Smile AI Assistant must be grounded in real clinic data.

Rules:

- Never fabricate appointments, patients, schedules, or clinical information.
- Use tools to retrieve relevant data.
- If evidence is unavailable, explicitly say that sufficient information could not be retrieved.
- Never treat an empty retrieval result as evidence that something does not exist unless the query semantics justify that conclusion.
- Tool failures must be surfaced safely.
- Never silently substitute invented data.
- Keep retrieved evidence separate from AI recommendations.
- AI must not automatically post or modify accounting/clinical records unless explicitly designed and authorized to do so.
- Preserve authentication and RLS boundaries when AI tools access Supabase.

## AI tool calling

When modifying the AI Assistant:

1. Inspect the complete tool-calling flow.
2. Verify authentication.
3. Verify tool parameters.
4. Verify Supabase queries.
5. Verify returned evidence.
6. Verify model/tool response handling.
7. Verify frontend response rendering.

Do not diagnose an AI failure from only one layer.

## Code organization

Prefer shared utilities for business rules.

For example:

- appointment status logic → shared appointment helper
- reminder behavior → shared reminder service
- API communication → existing service layer

Do not duplicate business rules across Dashboard, Calendar, Appointments, Reports, or AI tools.

## UI consistency

Maintain the existing Perfect Smile visual language.

Prefer:

- clear hierarchy
- restrained CTAs
- compact operational interfaces
- meaningful status indicators
- consistent spacing
- accessible controls

Do not add UI elements simply because they are technically possible.

Every CTA should have a clear purpose.

## Changes and files

Before modifying files:

Briefly state:

- exact files that will change
- what will change in each file
- why the change is necessary

For every modified code file, provide the COMPLETE replacement file.

Do not provide:

- partial snippets
- line-by-line edits
- "change this line" instructions

## Verification

After implementation, run when available:

- typecheck
- build
- lint

For workflow changes, also perform runtime verification.

Do not claim a workflow is working based only on static verification.

When a live dependency such as Gemini quota prevents testing, clearly distinguish:

- code verified
- dependency verified
- runtime behavior not verified

## Safety

Do not:

- expose API keys
- print authentication tokens
- commit secrets
- weaken RLS
- bypass authentication
- create live test data without approval
- fabricate database fields
- replace working architecture with unnecessary rewrites

## Preferred development process

Inspect
→ Explain findings
→ Propose minimal coherent change
→ Get approval when the change is consequential
→ Implement
→ Typecheck
→ Build
→ Lint
→ Runtime test
→ Report exactly what was verified