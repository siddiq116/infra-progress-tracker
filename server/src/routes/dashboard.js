import { Router } from "express";
import { query } from "../db/client.js";
import { requireAuth } from "../middleware/auth.js";
import { projectProgressSummary, taskProgressSummary } from "../utils/progress.js";

const router = Router();

router.use(requireAuth);

router.get("/summary", async (req, res) => {
  const [{ rows: projectRows }, { rows: taskRows }] = await Promise.all([
    query("SELECT * FROM projects"),
    query(
      `SELECT t.*, p.name AS project_name, p.code AS project_code
       FROM tasks t
       JOIN projects p ON p.id = t.project_id`
    ),
  ]);

  const tasksByProject = new Map();
  for (const t of taskRows) {
    const list = tasksByProject.get(t.project_id) || [];
    list.push(t);
    tasksByProject.set(t.project_id, list);
  }

  const projectCards = projectRows.map((project) => {
    const projectTasks = tasksByProject.get(project.id) || [];
    const summary = projectProgressSummary(
      projectTasks.map((t) => ({
        plannedStart: t.planned_start,
        plannedEnd: t.planned_end,
        actualProgress: Number(t.actual_progress),
        weight: Number(t.weight),
      }))
    );
    return {
      id: project.id,
      name: project.name,
      code: project.code,
      status: project.status,
      plannedStart: project.planned_start,
      plannedEnd: project.planned_end,
      taskCount: projectTasks.length,
      progress: summary,
    };
  });

  const tasksWithSummary = taskRows.map((t) => ({
    _id: t.id,
    name: t.name,
    plannedEnd: t.planned_end,
    project: { _id: t.project_id, name: t.project_name, code: t.project_code },
    progress: taskProgressSummary({
      plannedStart: t.planned_start,
      plannedEnd: t.planned_end,
      actualProgress: Number(t.actual_progress),
    }),
  }));

  const delayedTasks = tasksWithSummary
    .filter((t) => t.progress.status === "delayed")
    .sort((a, b) => a.progress.variance - b.progress.variance)
    .slice(0, 25);

  const statusCounts = tasksWithSummary.reduce(
    (acc, t) => {
      acc[t.progress.status] = (acc[t.progress.status] || 0) + 1;
      return acc;
    },
    { not_started: 0, in_progress: 0, delayed: 0, completed: 0 }
  );

  const { rows: recentUpdateRows } = await query(
    `SELECT pu.*, u.name AS submitter_name, u.role AS submitter_role,
            t.name AS task_name, p.name AS project_name, p.code AS project_code
     FROM progress_updates pu
     LEFT JOIN users u ON u.id = pu.submitted_by
     LEFT JOIN tasks t ON t.id = pu.task_id
     LEFT JOIN projects p ON p.id = pu.project_id
     ORDER BY pu.captured_at DESC
     LIMIT 10`
  );

  const recentUpdates = recentUpdateRows.map((row) => ({
    _id: row.id,
    actualProgress: Number(row.actual_progress),
    photoUrl: row.photo_url,
    capturedAt: row.captured_at,
    submittedBy: { name: row.submitter_name, role: row.submitter_role },
    task: { name: row.task_name },
    project: { name: row.project_name, code: row.project_code },
  }));

  res.json({
    totals: {
      projects: projectRows.length,
      tasks: taskRows.length,
      delayedTasks: delayedTasks.length,
      completedTasks: statusCounts.completed,
    },
    statusCounts,
    projects: projectCards,
    delayedTasks,
    recentUpdates,
  });
});

export default router;
