CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'site_engineer'
    CHECK (role IN ('admin', 'project_manager', 'site_engineer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  planned_start DATE NOT NULL,
  planned_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'in_progress', 'delayed', 'completed', 'on_hold')),
  manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  wbs_code TEXT NOT NULL DEFAULT '',
  planned_start DATE NOT NULL,
  planned_end DATE NOT NULL,
  weight NUMERIC NOT NULL DEFAULT 1,
  depends_on INTEGER[] NOT NULL DEFAULT '{}',
  assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
  actual_progress NUMERIC NOT NULL DEFAULT 0 CHECK (actual_progress BETWEEN 0 AND 100),
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'delayed', 'completed')),
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);

CREATE TABLE IF NOT EXISTS progress_updates (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  submitted_by INTEGER NOT NULL REFERENCES users(id),
  actual_progress NUMERIC NOT NULL CHECK (actual_progress BETWEEN 0 AND 100),
  remarks TEXT NOT NULL DEFAULT '',
  photo_url TEXT,
  geotag_lat DOUBLE PRECISION,
  geotag_lng DOUBLE PRECISION,
  geotag_accuracy DOUBLE PRECISION,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_progress_task ON progress_updates(task_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_progress_project ON progress_updates(project_id, captured_at DESC);
