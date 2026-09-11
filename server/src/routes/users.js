import { Router } from "express";
import { query } from "../db/client.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

function mapUserRow(row) {
  return { _id: row.id, name: row.name, email: row.email, role: row.role, createdAt: row.created_at };
}

router.get("/", async (req, res) => {
  const { rows } = await query("SELECT id, name, email, role, created_at FROM users ORDER BY name ASC");
  res.json({ users: rows.map(mapUserRow) });
});

router.patch("/:id/role", requireRole("admin"), async (req, res) => {
  const { role } = req.body;
  const allowedRoles = ["admin", "project_manager", "site_engineer"];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  const { rows } = await query(
    "UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role, created_at",
    [role, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ message: "User not found" });
  res.json({ user: mapUserRow(rows[0]) });
});

export default router;
