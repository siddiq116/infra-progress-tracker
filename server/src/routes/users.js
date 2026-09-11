import { Router } from "express";
import User from "../models/User.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  const users = await User.find().select("-password").sort({ name: 1 });
  res.json({ users });
});

router.patch("/:id/role", requireRole("admin"), async (req, res) => {
  const { role } = req.body;
  const allowedRoles = ["admin", "project_manager", "site_engineer"];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }
  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select("-password");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({ user });
});

export default router;
