import { Router } from "express";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import ProgressUpdate from "../models/ProgressUpdate.js";
import { requireAuth } from "../middleware/auth.js";
import { projectProgressSummary, taskProgressSummary } from "../utils/progress.js";

const router = Router();

router.use(requireAuth);

router.get("/summary", async (req, res) => {
  const projects = await Project.find();
  const tasks = await Task.find().populate("project", "name code").populate("assignedTo", "name");

  const projectCards = await Promise.all(
    projects.map(async (project) => {
      const projectTasks = tasks.filter((t) => String(t.project._id || t.project) === String(project._id));
      const summary = projectProgressSummary(projectTasks);
      return {
        id: project._id,
        name: project.name,
        code: project.code,
        status: project.status,
        plannedStart: project.plannedStart,
        plannedEnd: project.plannedEnd,
        taskCount: projectTasks.length,
        progress: summary,
      };
    })
  );

  const tasksWithSummary = tasks.map((t) => ({ ...t.toObject(), progress: taskProgressSummary(t) }));
  const delayedTasks = tasksWithSummary
    .filter((t) => t.progress.status === "delayed")
    .sort((a, b) => a.progress.variance - b.progress.variance)
    .slice(0, 25);

  const recentUpdates = await ProgressUpdate.find()
    .populate("submittedBy", "name role")
    .populate("task", "name")
    .populate("project", "name code")
    .sort({ capturedAt: -1 })
    .limit(10);

  const statusCounts = tasksWithSummary.reduce(
    (acc, t) => {
      acc[t.progress.status] = (acc[t.progress.status] || 0) + 1;
      return acc;
    },
    { not_started: 0, in_progress: 0, delayed: 0, completed: 0 }
  );

  res.json({
    totals: {
      projects: projects.length,
      tasks: tasks.length,
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
