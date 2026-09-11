import { Router } from "express";
import { query } from "../db/client.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { taskProgressSummary } from "../utils/progress.js";

const router = Router();

router.use(requireAuth);

const TASK_SELECT = `
  SELECT t.*, a.name AS assigned_to_name, a.email AS assigned_to_email
  FROM tasks t
  LEFT JOIN users a ON a.id = t.assigned_to
`;

function mapTaskRow(row) {
  return {
    _id: row.id,
    project: row.project_id,
    name: row.name,
    description: row.description,
    wbsCode: row.wbs_code,
    plannedStart: row.planned_start,
    plannedEnd: row.planned_end,
    weight: Number(row.weight),
    dependsOn: row.depends_on || [],
    assignedTo: row.assigned_to ? { _id: row.assigned_to, name: row.assigned_to_name, email: row.assigned_to_email } : null,
    actualProgress: Number(row.actual_progress),
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function forProgressUtil(row) {
  return {
    plannedStart: row.planned_start,
    plannedEnd: row.planned_end,
    actualProgress: Number(row.actual_progress),
  };
}

router.get("/", async (req, res) => {
  const filters = [];
  const params = [];
  if (req.query.project) {
    params.push(req.query.project);
    filters.push(`t.project_id = $${params.length}`);
  }
  if (req.query.assignedTo) {
    params.push(req.query.assignedTo);
    filters.push(`t.assigned_to = $${params.length}`);
  }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  const { rows } = await query(`${TASK_SELECT} ${where} ORDER BY t.planned_start ASC`, params);
  const tasks = rows.map((row) => ({ ...mapTaskRow(row), progress: taskProgressSummary(forProgressUtil(row)) }));
  res.json({ tasks });
});

router.get("/:id", async (req, res) => {
  const { rows } = await query(`${TASK_SELECT} WHERE t.id = $1`, [req.params.id]);
  const row = rows[0];
  if (!row) return res.status(404).json({ message: "Task not found" });
  res.json({ task: { ...mapTaskRow(row), progress: taskProgressSummary(forProgressUtil(row)) } });
});

router.post("/", requireRole("admin", "project_manager"), async (req, res) => {
  try {
    const { project, name, description, wbsCode, plannedStart, plannedEnd, weight, dependsOn, assignedTo } = req.body;
    if (!project || !name || !plannedStart || !plannedEnd) {
      return res.status(400).json({ message: "project, name, plannedStart and plannedEnd are required" });
    }

    const { rows: projectRows } = await query("SELECT id FROM projects WHERE id = $1", [project]);
    if (!projectRows[0]) return res.status(404).json({ message: "Project not found" });

    const { rows } = await query(
      `INSERT INTO tasks (project_id, name, description, wbs_code, planned_start, planned_end, weight, depends_on, assigned_to, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [
        project,
        name,
        description || "",
        wbsCode || "",
        plannedStart,
        plannedEnd,
        weight || 1,
        Array.isArray(dependsOn) ? dependsOn : [],
        assignedTo || null,
        req.user.id,
      ]
    );

    const { rows: fullRows } = await query(`${TASK_SELECT} WHERE t.id = $1`, [rows[0].id]);
    res.status(201).json({ task: mapTaskRow(fullRows[0]) });
  } catch (err) {
    res.status(500).json({ message: "Failed to create task", error: err.message });
  }
});

router.put("/:id", requireRole("admin", "project_manager"), async (req, res) => {
  const { name, description, wbsCode, plannedStart, plannedEnd, weight, dependsOn, assignedTo } = req.body;
  const { rows } = await query(
    `UPDATE tasks SET
       name = COALESCE($1, name),
       description = COALESCE($2, description),
       wbs_code = COALESCE($3, wbs_code),
       planned_start = COALESCE($4, planned_start),
       planned_end = COALESCE($5, planned_end),
       weight = COALESCE($6, weight),
       depends_on = COALESCE($7, depends_on),
       assigned_to = COALESCE($8, assigned_to),
       updated_at = now()
     WHERE id = $9 RETURNING id`,
    [name, description, wbsCode, plannedStart, plannedEnd, weight, dependsOn, assignedTo, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ message: "Task not found" });

  const { rows: fullRows } = await query(`${TASK_SELECT} WHERE t.id = $1`, [req.params.id]);
  res.json({ task: mapTaskRow(fullRows[0]) });
});

router.delete("/:id", requireRole("admin", "project_manager"), async (req, res) => {
  const { rows } = await query("DELETE FROM tasks WHERE id = $1 RETURNING id", [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: "Task not found" });
  res.json({ message: "Task deleted" });
});

export default router;
