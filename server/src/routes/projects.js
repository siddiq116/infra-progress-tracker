import { Router } from "express";
import { query } from "../db/client.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { projectProgressSummary } from "../utils/progress.js";

const router = Router();

router.use(requireAuth);

const PROJECT_SELECT = `
  SELECT p.*,
         m.name AS manager_name, m.email AS manager_email,
         c.name AS created_by_name, c.email AS created_by_email
  FROM projects p
  LEFT JOIN users m ON m.id = p.manager_id
  LEFT JOIN users c ON c.id = p.created_by
`;

function mapProjectRow(row) {
  return {
    _id: row.id,
    name: row.name,
    code: row.code,
    description: row.description,
    location: row.location,
    plannedStart: row.planned_start,
    plannedEnd: row.planned_end,
    status: row.status,
    manager: row.manager_id ? { _id: row.manager_id, name: row.manager_name, email: row.manager_email } : null,
    createdBy: row.created_by ? { _id: row.created_by, name: row.created_by_name, email: row.created_by_email } : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function forProgressUtil(row) {
  return {
    plannedStart: row.planned_start,
    plannedEnd: row.planned_end,
    actualProgress: Number(row.actual_progress),
    weight: Number(row.weight),
  };
}

router.get("/", async (req, res) => {
  const [{ rows: projectRows }, { rows: taskRows }] = await Promise.all([
    query(`${PROJECT_SELECT} ORDER BY p.created_at DESC`),
    query("SELECT project_id, planned_start, planned_end, actual_progress, weight FROM tasks"),
  ]);

  const tasksByProject = new Map();
  for (const t of taskRows) {
    const list = tasksByProject.get(t.project_id) || [];
    list.push(t);
    tasksByProject.set(t.project_id, list);
  }

  const projects = projectRows.map((row) => {
    const projectTasks = tasksByProject.get(row.id) || [];
    const summary = projectProgressSummary(projectTasks.map(forProgressUtil));
    return { ...mapProjectRow(row), progress: summary, taskCount: projectTasks.length };
  });

  res.json({ projects });
});

router.get("/:id", async (req, res) => {
  const { rows } = await query(`${PROJECT_SELECT} WHERE p.id = $1`, [req.params.id]);
  const row = rows[0];
  if (!row) return res.status(404).json({ message: "Project not found" });

  const { rows: taskRows } = await query(
    "SELECT planned_start, planned_end, actual_progress, weight FROM tasks WHERE project_id = $1",
    [row.id]
  );
  const summary = projectProgressSummary(taskRows.map(forProgressUtil));

  res.json({ project: { ...mapProjectRow(row), progress: summary, taskCount: taskRows.length } });
});

router.post("/", requireRole("admin", "project_manager"), async (req, res) => {
  try {
    const { name, code, description, location, plannedStart, plannedEnd, manager } = req.body;
    if (!name || !code || !plannedStart || !plannedEnd) {
      return res.status(400).json({ message: "name, code, plannedStart and plannedEnd are required" });
    }

    const { rows } = await query(
      `INSERT INTO projects (name, code, description, location, planned_start, planned_end, manager_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [
        name,
        code.toUpperCase(),
        description || "",
        location || "",
        plannedStart,
        plannedEnd,
        manager || req.user.id,
        req.user.id,
      ]
    );

    const { rows: fullRows } = await query(`${PROJECT_SELECT} WHERE p.id = $1`, [rows[0].id]);
    res.status(201).json({ project: mapProjectRow(fullRows[0]) });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ message: "Project code already exists" });
    res.status(500).json({ message: "Failed to create project", error: err.message });
  }
});

router.put("/:id", requireRole("admin", "project_manager"), async (req, res) => {
  const { name, description, location, plannedStart, plannedEnd, status, manager } = req.body;
  const { rows } = await query(
    `UPDATE projects SET
       name = COALESCE($1, name),
       description = COALESCE($2, description),
       location = COALESCE($3, location),
       planned_start = COALESCE($4, planned_start),
       planned_end = COALESCE($5, planned_end),
       status = COALESCE($6, status),
       manager_id = COALESCE($7, manager_id),
       updated_at = now()
     WHERE id = $8 RETURNING id`,
    [name, description, location, plannedStart, plannedEnd, status, manager, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ message: "Project not found" });

  const { rows: fullRows } = await query(`${PROJECT_SELECT} WHERE p.id = $1`, [req.params.id]);
  res.json({ project: mapProjectRow(fullRows[0]) });
});

router.delete("/:id", requireRole("admin"), async (req, res) => {
  const { rows } = await query("DELETE FROM projects WHERE id = $1 RETURNING id", [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: "Project not found" });
  res.json({ message: "Project deleted" });
});

export default router;
