import { Router } from "express";
import Task from "../models/Task.js";
import Project from "../models/Project.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { taskProgressSummary } from "../utils/progress.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  const filter = {};
  if (req.query.project) filter.project = req.query.project;
  if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;

  const tasks = await Task.find(filter)
    .populate("assignedTo", "name email")
    .populate("dependsOn", "name")
    .sort({ plannedStart: 1 });

  const withProgress = tasks.map((task) => ({ ...task.toObject(), progress: taskProgressSummary(task) }));
  res.json({ tasks: withProgress });
});

router.get("/:id", async (req, res) => {
  const task = await Task.findById(req.params.id).populate("assignedTo", "name email").populate("dependsOn", "name");
  if (!task) return res.status(404).json({ message: "Task not found" });
  res.json({ task: { ...task.toObject(), progress: taskProgressSummary(task) } });
});

router.post("/", requireRole("admin", "project_manager"), async (req, res) => {
  try {
    const { project, name, description, wbsCode, plannedStart, plannedEnd, weight, dependsOn, assignedTo } = req.body;
    if (!project || !name || !plannedStart || !plannedEnd) {
      return res.status(400).json({ message: "project, name, plannedStart and plannedEnd are required" });
    }

    const projectExists = await Project.findById(project);
    if (!projectExists) return res.status(404).json({ message: "Project not found" });

    const task = await Task.create({
      project,
      name,
      description,
      wbsCode,
      plannedStart,
      plannedEnd,
      weight,
      dependsOn,
      assignedTo,
      createdBy: req.user._id,
    });

    res.status(201).json({ task });
  } catch (err) {
    res.status(500).json({ message: "Failed to create task", error: err.message });
  }
});

router.put("/:id", requireRole("admin", "project_manager"), async (req, res) => {
  const { name, description, wbsCode, plannedStart, plannedEnd, weight, dependsOn, assignedTo } = req.body;
  const task = await Task.findByIdAndUpdate(
    req.params.id,
    { name, description, wbsCode, plannedStart, plannedEnd, weight, dependsOn, assignedTo },
    { new: true, runValidators: true }
  );
  if (!task) return res.status(404).json({ message: "Task not found" });
  res.json({ task });
});

router.delete("/:id", requireRole("admin", "project_manager"), async (req, res) => {
  const task = await Task.findByIdAndDelete(req.params.id);
  if (!task) return res.status(404).json({ message: "Task not found" });
  res.json({ message: "Task deleted" });
});

export default router;
