# Real-Time Infrastructure Progress Tracking

A web platform for **SIH26122 — Intelligent Data Capture & Schedule-Linking Layer for
Infrastructure Project Management**. It bridges planning and execution by letting field
teams capture *actual* progress (with photo + GPS evidence) and automatically comparing it
against the *planned* schedule, surfacing variance and delay alerts in real time.

Deployed as a single Vercel project: a static React frontend plus an Express API running as
a Vercel serverless function, backed by Neon Postgres and Vercel Blob for photo storage.

## What it does

- **Schedule-linking engine** — every task carries a planned start/end date. The backend
  derives a live "planned % complete" from today's date and diffs it against the
  field-reported actual %, so delays surface automatically instead of relying on manual
  RAG-status guesses.
- **Real-time data capture** — site engineers log progress with a photo and GPS geotag
  captured straight from the browser (`server/src/routes/progress.js`,
  `client/src/pages/TaskDetail.jsx`).
- **Role-based workflow** — `admin`, `project_manager`, `site_engineer` roles gate who can
  create projects/tasks vs. who can only submit field updates.
- **Program dashboard** — planned-vs-actual charts, task-status breakdown, a live delay/alert
  feed, and a recent field-updates feed (`client/src/pages/Dashboard.jsx`).

## Tech stack

- **Backend:** Node.js, Express (as a Vercel serverless function), Postgres via
  [Neon](https://neon.tech) (`pg`, with a pooled connection cached across warm
  invocations), JWT auth, Multer (in-memory) + Vercel Blob for photo uploads.
- **Frontend:** React (Vite), React Router, Recharts, Tailwind CSS, Axios.

## Project structure

```
api/index.js       Vercel serverless entry point — re-exports the Express app
server/src/db/      Postgres schema, migration script, connection pool
server/src/         Express app, routes, schedule-linking logic
client/              React + Vite single-page app
vercel.json         Routes /api/* to the serverless function, builds client/dist
```

## Deploying on Vercel

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. In the [Vercel dashboard](https://vercel.com/new), import the repo. `vercel.json` at the
   root configures the build automatically — no manual framework settings needed.
3. In the project's **Storage** tab: add a **Blob** store (sets `BLOB_READ_WRITE_TOKEN`
   automatically) and connect/create a **Neon** Postgres database (sets `DATABASE_URL` and
   `DATABASE_URL_UNPOOLED` automatically).
4. In **Settings → Environment Variables**, add `JWT_SECRET` (any long random string) and
   optionally `JWT_EXPIRES_IN` (defaults to `7d`).
5. Run the schema migration once against the new database: `npm run migrate` locally with
   `DATABASE_URL_UNPOOLED` pulled via `vercel env pull .env.local`. Then optionally
   `npm run seed` for demo data, or just deploy and register a fresh admin account via
   `/register`.
6. Deploy (push to `main`, or `vercel --prod`).

## Local development

### Prerequisites

- Node.js 18+
- A Neon Postgres database (or any Postgres instance) — `vercel env pull .env.local` after
  connecting Neon storage to the Vercel project is the fastest way to get credentials

### 1. Install & configure

```bash
vercel env pull .env.local   # or: cp .env.example .env.local and fill in DATABASE_URL etc.
npm install                    # installs the API's dependencies (root package.json)
npm run migrate                # creates the schema (uses DATABASE_URL_UNPOOLED)
npm run seed                   # creates demo users, 2 projects, and sample tasks/progress
```

Photo uploads need `BLOB_READ_WRITE_TOKEN` too (included in `vercel env pull`), or just skip
photos locally — progress updates work fine without one; only the photo field needs it.

### 2. Run the API

```bash
npm run dev:server           # http://localhost:5000
```

### 3. Run the client

```bash
cd client && cp .env.example .env   # set VITE_API_URL=http://localhost:5000
cd ..
npm run dev:client                   # http://localhost:5173
```

Open http://localhost:5173 and sign in with a demo account (password: `password123`) — the
login page has one-click buttons to fill them in:

| Role             | Email               |
| ---------------- | -------------------- |
| Admin             | admin@sih.demo       |
| Project Manager   | pm@sih.demo           |
| Site Engineer     | engineer@sih.demo     |

## Core data model

Schema: `server/src/db/schema.sql`.

- **users** — name, email, password hash, role.
- **projects** — planned start/end, location, status, manager.
- **tasks** (WBS item) — belongs to a project; planned start/end, weight (for weighted
  roll-ups), assignee, dependencies (`depends_on` integer array), cached
  `actual_progress`/`status`.
- **progress_updates** — an immutable field-capture event: task, submitter, actual %,
  remarks, photo URL (Vercel Blob), GPS geotag, timestamp. Each new update recomputes the
  parent task's status and rolls up into the project's overall status.

The planned-vs-actual math lives in `server/src/utils/progress.js` (pure functions, no DB
dependency):

- `plannedProgressAt` — linear interpolation of expected % complete between a task's planned
  start and end dates.
- `taskProgressSummary` / `projectProgressSummary` — combine planned vs. actual into a
  variance figure and a derived status (`not_started` / `in_progress` / `delayed` / `completed`),
  with project-level figures weighted by task `weight`.

## API overview

All routes are prefixed with `/api` and (except `/auth/login|register`) require an
`Authorization: Bearer <token>` header.

| Method & path                        | Purpose                                      |
| ------------------------------------- | --------------------------------------------- |
| `POST /auth/register` / `/auth/login` | Create an account / obtain a JWT              |
| `GET /projects` / `POST /projects`    | List / create projects                        |
| `GET /tasks?project=<id>`             | List a project's WBS tasks with progress      |
| `POST /tasks`                          | Add a task (admin / project_manager)          |
| `POST /progress` (multipart)          | Log a field progress update (photo + geotag)  |
| `GET /progress/task/:taskId`          | Progress history for one task                 |
| `GET /dashboard/summary`              | Aggregated stats, alerts, recent activity      |
