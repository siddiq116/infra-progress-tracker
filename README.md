# Real-Time Infrastructure Progress Tracking

A web platform for **SIH26122 — Intelligent Data Capture & Schedule-Linking Layer for
Infrastructure Project Management**. It bridges planning and execution by letting field
teams capture *actual* progress (with photo + GPS evidence) and automatically comparing it
against the *planned* schedule, surfacing variance and delay alerts in real time.

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

- **Backend:** Node.js, Express, MongoDB (Mongoose), JWT auth, Multer for photo uploads.
- **Frontend:** React (Vite), React Router, Recharts, Tailwind CSS, Axios.

## Project structure

```
server/   Express API, MongoDB models, schedule-linking logic, photo uploads
client/   React + Vite single-page app
```

## Getting started

### Prerequisites

- Node.js 18+
- A MongoDB instance (local `mongod`, Docker, or [MongoDB Atlas](https://www.mongodb.com/atlas))

### 1. Backend

```bash
cd server
cp .env.example .env      # edit MONGO_URI / JWT_SECRET if needed
npm install
npm run seed               # creates demo users, 2 projects, and sample tasks/progress
npm run dev                # http://localhost:5000
```

Demo accounts created by the seed script (password: `password123`):

| Role             | Email               |
| ---------------- | -------------------- |
| Admin             | admin@sih.demo       |
| Project Manager   | pm@sih.demo           |
| Site Engineer     | engineer@sih.demo     |

### 2. Frontend

```bash
cd client
cp .env.example .env      # VITE_API_URL, defaults to http://localhost:5000
npm install
npm run dev                 # http://localhost:5173
```

Open http://localhost:5173 and sign in with one of the demo accounts above (the login page
has one-click buttons to fill them in).

## Core data model

- **Project** — planned start/end, location, status, manager.
- **Task** (WBS item) — belongs to a project; planned start/end, weight (for weighted
  roll-ups), assignee, dependencies, cached `actualProgress`/`status`.
- **ProgressUpdate** — an immutable field-capture event: task, submitter, actual %, remarks,
  photo URL, GPS geotag, timestamp. Each new update recomputes the parent task's status and
  rolls up into the project's overall status.

The planned-vs-actual math lives in `server/src/utils/progress.js`:

- `plannedProgressAt` — linear interpolation of expected % complete between a task's planned
  start and end dates.
- `taskProgressSummary` / `projectProgressSummary` — combine planned vs. actual into a
  variance figure and a derived status (`not_started` / `in_progress` / `delayed` / `completed`),
  with project-level figures weighted by task `weight`.

## API overview

All routes are prefixed with `/api` and (except `/auth/login|register`) require a
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

## Notes for deployment

- Uploaded photos are written to `server/uploads/` and served at `/uploads/<file>`; swap the
  `multer.diskStorage` in `server/src/middleware/upload.js` for S3/Cloud Storage in
  production.
- Set a strong `JWT_SECRET` and restrict `CLIENT_ORIGIN` in `server/.env` before deploying.
