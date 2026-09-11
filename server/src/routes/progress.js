import { Router } from "express";
import { put } from "@vercel/blob";
import { query } from "../db/client.js";
import { requireAuth } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import { deriveTaskStatus, taskProgressSummary } from "../utils/progress.js";

const router = Router();

router.use(requireAuth);

const UPDATE_SELECT = `
  SELECT pu.*, u.name AS submitter_name, u.email AS submitter_email, u.role AS submitter_role
  FROM progress_updates pu
  LEFT JOIN users u ON u.id = pu.submitted_by
`;

function mapUpdateRow(row) {
  return {
    _id: row.id,
    task: row.task_id,
    project: row.project_id,
    submittedBy: row.submitted_by
      ? { _id: row.submitted_by, name: row.submitter_name, email: row.submitter_email, role: row.submitter_role }
      : null,
    actualProgress: Number(row.actual_progress),
    remarks: row.remarks,
    photoUrl: row.photo_url,
    geotag: { lat: row.geotag_lat, lng: row.geotag_lng, accuracy: row.geotag_accuracy },
    capturedAt: row.captured_at,
    createdAt: row.created_at,
  };
}

router.get("/task/:taskId", async (req, res) => {
  const { rows } = await query(`${UPDATE_SELECT} WHERE pu.task_id = $1 ORDER BY pu.captured_at DESC`, [
    req.params.taskId,
  ]);
  res.json({ updates: rows.map(mapUpdateRow) });
});

router.get("/project/:projectId", async (req, res) => {
  const { rows } = await query(
    `SELECT pu.*, u.name AS submitter_name, u.email AS submitter_email, u.role AS submitter_role,
            t.name AS task_name
     FROM progress_updates pu
     LEFT JOIN users u ON u.id = pu.submitted_by
     LEFT JOIN tasks t ON t.id = pu.task_id
     WHERE pu.project_id = $1
     ORDER BY pu.captured_at DESC
     LIMIT 100`,
    [req.params.projectId]
  );
  res.json({ updates: rows.map((row) => ({ ...mapUpdateRow(row), task: { _id: row.task_id, name: row.task_name } })) });
});

router.post("/", upload.single("photo"), async (req, res) => {
  try {
    const { task: taskId, actualProgress, remarks, lat, lng, accuracy } = req.body;
    if (!taskId || actualProgress === undefined) {
      return res.status(400).json({ message: "task and actualProgress are required" });
    }

    const { rows: taskRows } = await query("SELECT * FROM tasks WHERE id = $1", [taskId]);
    const task = taskRows[0];
    if (!task) return res.status(404).json({ message: "Task not found" });

    const progressValue = Math.max(0, Math.min(100, Number(actualProgress)));

    let photoUrl = null;
    if (req.file) {
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return res.status(500).json({ message: "Photo storage is not configured (missing BLOB_READ_WRITE_TOKEN)" });
      }
      const blob = await put(`progress/${task.id}-${Date.now()}-${req.file.originalname}`, req.file.buffer, {
        access: "public",
        contentType: req.file.mimetype,
      });
      photoUrl = blob.url;
    }

    const { rows: insertRows } = await query(
      `INSERT INTO progress_updates (task_id, project_id, submitted_by, actual_progress, remarks, photo_url, geotag_lat, geotag_lng, geotag_accuracy)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [
        task.id,
        task.project_id,
        req.user.id,
        progressValue,
        remarks || "",
        photoUrl,
        lat ? Number(lat) : null,
        lng ? Number(lng) : null,
        accuracy ? Number(accuracy) : null,
      ]
    );

    const newStatus = deriveTaskStatus({
      plannedStart: task.planned_start,
      plannedEnd: task.planned_end,
      actualProgress: progressValue,
    });

    await query("UPDATE tasks SET actual_progress = $1, status = $2, updated_at = now() WHERE id = $3", [
      progressValue,
      newStatus,
      task.id,
    ]);

    // Roll the task's state up into the parent project's overall status.
    const { rows: siblingRows } = await query("SELECT status, actual_progress FROM tasks WHERE project_id = $1", [
      task.project_id,
    ]);
    const anyDelayed = siblingRows.some((t) => t.status === "delayed");
    const allCompleted = siblingRows.every((t) => t.status === "completed");
    const anyStarted = siblingRows.some((t) => Number(t.actual_progress) > 0);

    let projectStatus = "planned";
    if (allCompleted) projectStatus = "completed";
    else if (anyDelayed) projectStatus = "delayed";
    else if (anyStarted) projectStatus = "in_progress";

    await query("UPDATE projects SET status = $1, updated_at = now() WHERE id = $2", [projectStatus, task.project_id]);

    const { rows: updateRows } = await query(`${UPDATE_SELECT} WHERE pu.id = $1`, [insertRows[0].id]);
    const { rows: updatedTaskRows } = await query(
      `SELECT t.*, a.name AS assigned_to_name, a.email AS assigned_to_email
       FROM tasks t LEFT JOIN users a ON a.id = t.assigned_to WHERE t.id = $1`,
      [task.id]
    );
    const updatedTask = updatedTaskRows[0];

    res.status(201).json({
      update: mapUpdateRow(updateRows[0]),
      task: {
        _id: updatedTask.id,
        project: updatedTask.project_id,
        name: updatedTask.name,
        wbsCode: updatedTask.wbs_code,
        plannedStart: updatedTask.planned_start,
        plannedEnd: updatedTask.planned_end,
        actualProgress: Number(updatedTask.actual_progress),
        status: updatedTask.status,
        assignedTo: updatedTask.assigned_to
          ? { _id: updatedTask.assigned_to, name: updatedTask.assigned_to_name, email: updatedTask.assigned_to_email }
          : null,
        progress: taskProgressSummary({
          plannedStart: updatedTask.planned_start,
          plannedEnd: updatedTask.planned_end,
          actualProgress: Number(updatedTask.actual_progress),
        }),
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to record progress update", error: err.message });
  }
});

export default router;
