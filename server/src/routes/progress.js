import { Router } from "express";
import { put } from "@vercel/blob";
import Task from "../models/Task.js";
import ProgressUpdate from "../models/ProgressUpdate.js";
import Project from "../models/Project.js";
import { requireAuth } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import { deriveTaskStatus, taskProgressSummary } from "../utils/progress.js";

const router = Router();

router.use(requireAuth);

router.get("/task/:taskId", async (req, res) => {
  const updates = await ProgressUpdate.find({ task: req.params.taskId })
    .populate("submittedBy", "name email role")
    .sort({ capturedAt: -1 });
  res.json({ updates });
});

router.get("/project/:projectId", async (req, res) => {
  const updates = await ProgressUpdate.find({ project: req.params.projectId })
    .populate("submittedBy", "name email role")
    .populate("task", "name")
    .sort({ capturedAt: -1 })
    .limit(100);
  res.json({ updates });
});

router.post("/", upload.single("photo"), async (req, res) => {
  try {
    const { task: taskId, actualProgress, remarks, lat, lng, accuracy } = req.body;
    if (!taskId || actualProgress === undefined) {
      return res.status(400).json({ message: "task and actualProgress are required" });
    }

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const progressValue = Math.max(0, Math.min(100, Number(actualProgress)));

    let photoUrl = null;
    if (req.file) {
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return res.status(500).json({ message: "Photo storage is not configured (missing BLOB_READ_WRITE_TOKEN)" });
      }
      const blob = await put(`progress/${task._id}-${Date.now()}-${req.file.originalname}`, req.file.buffer, {
        access: "public",
        contentType: req.file.mimetype,
      });
      photoUrl = blob.url;
    }

    const update = await ProgressUpdate.create({
      task: task._id,
      project: task.project,
      submittedBy: req.user._id,
      actualProgress: progressValue,
      remarks: remarks || "",
      photoUrl,
      geotag: {
        lat: lat ? Number(lat) : null,
        lng: lng ? Number(lng) : null,
        accuracy: accuracy ? Number(accuracy) : null,
      },
    });

    task.actualProgress = progressValue;
    task.status = deriveTaskStatus({
      plannedStart: task.plannedStart,
      plannedEnd: task.plannedEnd,
      actualProgress: progressValue,
    });
    await task.save();

    // Roll the task's state up into the parent project's overall status.
    const siblingTasks = await Task.find({ project: task.project });
    const anyDelayed = siblingTasks.some((t) => t.status === "delayed");
    const allCompleted = siblingTasks.every((t) => t.status === "completed");
    const anyStarted = siblingTasks.some((t) => t.actualProgress > 0);

    let projectStatus = "planned";
    if (allCompleted) projectStatus = "completed";
    else if (anyDelayed) projectStatus = "delayed";
    else if (anyStarted) projectStatus = "in_progress";

    await Project.findByIdAndUpdate(task.project, { status: projectStatus });

    res.status(201).json({ update, task: { ...task.toObject(), progress: taskProgressSummary(task) } });
  } catch (err) {
    res.status(500).json({ message: "Failed to record progress update", error: err.message });
  }
});

export default router;
