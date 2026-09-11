import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "../db/client.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

function toSafeUser(row) {
  return { id: row.id, name: row.name, email: row.email, role: row.role, createdAt: row.created_at };
}

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const { rows: existing } = await query("SELECT id FROM users WHERE email = $1", [normalizedEmail]);
    if (existing.length) return res.status(409).json({ message: "Email already registered" });

    const allowedRoles = ["admin", "project_manager", "site_engineer"];
    const finalRole = allowedRoles.includes(role) ? role : "site_engineer";
    const passwordHash = await bcrypt.hash(password, 10);

    const { rows } = await query(
      "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at",
      [name, normalizedEmail, passwordHash, finalRole]
    );

    const user = rows[0];
    const token = signToken(user);
    res.status(201).json({ token, user: toSafeUser(user) });
  } catch (err) {
    res.status(500).json({ message: "Registration failed", error: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const { rows } = await query("SELECT * FROM users WHERE email = $1", [email.toLowerCase().trim()]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = signToken(user);
    res.json({ token, user: toSafeUser(user) });
  } catch (err) {
    res.status(500).json({ message: "Login failed", error: err.message });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  res.json({ user: toSafeUser(req.user) });
});

export default router;
