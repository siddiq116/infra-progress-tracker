import { Router } from "express";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { projectProgressSummary } from "../utils/progress.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  const projects = await Project.find().populate("manager", "name email").populate("createdBy", "name email").sort({ createdAt: -1 });

  const withProgress = await Promise.all(
    projects.map(async (project) => {
      const tasks = await Task.find({ project: project._id });
      const summary = projectProgressSummary(tasks);
      return { ...project.toObject(), progress: summary, taskCount: tasks.length };
    })
  );

  res.json({ projects: withProgress });
});

router.get("/:id", async (req, res) => {
  const project = await Project.findById(req.params.id).populate("manager", "name email").populate("createdBy", "name email");
  if (!project) return res.status(404).json({ message: "Project not found" });

  const tasks = await Task.find({ project: project._id });
  const summary = projectProgressSummary(tasks);

  res.json({ project: { ...project.toObject(), progress: summary, taskCount: tasks.length } });
});

router.post("/", requireRole("admin", "project_manager"), async (req, res) => {
  try {
    const { name, code, description, location, plannedStart, plannedEnd, manager } = req.body;
    if (!name || !code || !plannedStart || !plannedEnd) {
      return res.status(400).json({ message: "name, code, plannedStart and plannedEnd are required" });
    }

    const project = await Project.create({
      name,
      code,
      description,
      location,
      plannedStart,
      plannedEnd,
      manager: manager || req.user._id,
      createdBy: req.user._id,
    });

    res.status(201).json({ project });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: "Project code already exists" });
    res.status(500).json({ message: "Failed to create project", error: err.message });
  }
});

router.put("/:id", requireRole("admin", "project_manager"), async (req, res) => {
  const { name, description, location, plannedStart, plannedEnd, status, manager } = req.body;
  const project = await Project.findByIdAndUpdate(
    req.params.id,
    { name, description, location, plannedStart, plannedEnd, status, manager },
    { new: true, runValidators: true }
  );
  if (!project) return res.status(404).json({ message: "Project not found" });
  res.json({ project });
});

router.delete("/:id", requireRole("admin"), async (req, res) => {
  const project = await Project.findByIdAndDelete(req.params.id);
  if (!project) return res.status(404).json({ message: "Project not found" });
  await Task.deleteMany({ project: project._id });
  res.json({ message: "Project deleted" });
});

export default router;
