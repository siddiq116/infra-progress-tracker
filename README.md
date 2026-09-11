# Real-Time Infrastructure Progress Tracking

A web platform for **SIH26122 — Intelligent Data Capture & Schedule-Linking Layer for
Infrastructure Project Management**. It bridges planning and execution by letting field
teams capture *actual* progress (with photo + GPS evidence) and automatically comparing it
against the *planned* schedule, surfacing variance and delay alerts in real time.

Built to deploy as a single Vercel project: a static React frontend plus an Express API
running as a Vercel serverless function, backed by MongoDB Atlas and Vercel Blob for photo
storage.

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

- **Backend:** Node.js, Express (as a Vercel serverless function), MongoDB (Mongoose), JWT
  auth, Multer (in-memory) + Vercel Blob for photo uploads.
- **Frontend:** React (Vite), React Router, Recharts, Tailwind CSS, Axios.

## Project structure

```
api/index.js    Vercel serverless entry point — re-exports the Express app
server/src/     Express app, MongoDB models, schedule-linking logic, routes
client/         React + Vite single-page app
vercel.json     Routes /api/* to the serverless function, builds client/dist
```

## Deploying on Vercel

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. In the [Vercel dashboard](https://vercel.com/new), import the repo. `vercel.json` at the
   root configures the build automatically — no manual framework settings needed.
3. In the project's **Storage** tab, add a **Blob** store. This automatically sets the
   `BLOB_READ_WRITE_TOKEN` environment variable used by photo uploads.
4. In **Settings → Environment Variables**, add:
   - `MONGO_URI` — a [MongoDB Atlas](https://www.mongodb.com/atlas) connection string (Vercel
     functions can't reach a local `mongod`)
   - `JWT_SECRET` — any long random string
   - `JWT_EXPIRES_IN` — e.g. `7d`
5. Deploy. Then run the seed script once against the same `MONGO_URI` (see below) to create
   demo accounts, or register a fresh admin account via `/register`.

## Local development

### Prerequisites

- Node.js 18+
- A MongoDB instance (local `mongod`, Docker, or MongoDB Atlas)

### 1. Install & configure

```bash
cp .env.example .env        # edit MONGO_URI / JWT_SECRET
npm install                  # installs the API's dependencies (root package.json)
npm run seed                 # creates demo users, 2 projects, and sample tasks/progress
```

Photo uploads need `BLOB_READ_WRITE_TOKEN` in `.env` too — pull it from a Vercel project with
Blob storage enabled via `vercel env pull .env.development.local`, or just skip photos locally
(progress updates work fine without one; only the photo field needs the token).

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

- **Project** — planned start/end, location, status, manager.
- **Task** (WBS item) — belongs to a project; planned start/end, weight (for weighted
  roll-ups), assignee, dependencies, cached `actualProgress`/`status`.
- **ProgressUpdate** — an immutable field-capture event: task, submitter, actual %, remarks,
  photo URL (Vercel Blob), GPS geotag, timestamp. Each new update recomputes the parent
  task's status and rolls up into the project's overall status.

The planned-vs-actual math lives in `server/src/utils/progress.js`:

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
