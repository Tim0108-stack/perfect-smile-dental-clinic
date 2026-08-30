# Perfect Smile Clinic Workspace

Foundation for the internal clinic management application that will
replace the existing single-file HTML/JS Perfect Smile app.

> **Status: appointment migration complete.** Appointment access, validation,
> authenticated API routes, dashboard data, and the create/edit workflow are
> migrated. Calendar, follow-ups, reminders, and reports remain for later phases.

## Tech stack

- **Client:** React + TypeScript + Vite + Tailwind CSS + React Router + Supabase JS client
- **Server:** Node.js + Express + TypeScript
- **Shared:** a small `shared/types` package used by both client and server

## Project structure

```text
perfect-smile/
├── client/     React + Vite frontend
├── server/     Express API foundation
├── shared/     Types shared between client and server
└── .env.example
```

## 1. Install dependencies

From the project root (this installs both `client` and `server` via npm workspaces):

```bash
npm install
```

## 2. Configure environment variables

Copy the example env file and fill in your Supabase project's client-safe keys:

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Both the client and the server read from this single root `.env` file — there's
no need to duplicate it into `client/.env` or `server/.env`.

The client will still boot without Supabase credentials set (you'll see a
console warning), but authenticated appointment access requires valid
credentials and the existing Supabase schema.

## 3. Start the frontend

```bash
npm run dev:client
```

Runs the Vite dev server at http://localhost:5173.

## 4. Start the backend

```bash
npm run dev:server
```

Runs the Express API at http://localhost:3001. Verify it's alive:

```bash
curl http://localhost:3001/api/health
```

## 5. Run both during development

```bash
npm run dev
```

Runs the client and server together. The Vite dev server proxies `/api/*`
requests to the Express server, so the frontend can call `fetch("/api/health")`
without CORS configuration in dev.

## Other scripts

| Command | Description |
| --- | --- |
| `npm run build` | Builds both server and client for production |
| `npm run typecheck` | Type-checks both workspaces |
| `npm run lint` | Lints the client |

## What's included in this foundation

- Responsive application shell: fixed sidebar, mobile top bar, collapsible mobile nav
- Sidebar navigation for Dashboard, Follow-ups, Calendar, Reports, and New Appointment
- Authenticated appointment API and dashboard appointment data
- Appointment create/edit form, status updates, deletion confirmation, search, and date filters
- Shared UI components: Button, Card, Input, Select, Textarea, Modal, Badge, Toast,
  Loading/Empty/Error states
- Routing for `/dashboard`, `/calendar`, `/follow-ups`, `/reports`, `/appointments/new`
- Supabase client and authenticated server requests configured via environment variables
- Express server with authenticated appointment routes, `/api/health`, CORS, and centralized error handling
- Visual language ported from the existing Perfect Smile app: teal brand
  colour, Inter/Inter Tight typography, white cards, subtle borders/shadows,
  accessible focus states

## Next phase

Calendar, follow-ups, reminders, and reports will be migrated in later phases.
