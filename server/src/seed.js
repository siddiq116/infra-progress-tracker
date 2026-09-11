import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { pool, query } from "./db/client.js";
import { deriveTaskStatus } from "./utils/progress.js";

dotenv.config();

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function run() {
  console.log("Clearing existing demo data...");
  await query("TRUNCATE progress_updates, tasks, projects, users RESTART IDENTITY CASCADE");

  const passwordHash = await bcrypt.hash("password123", 10);

  const { rows: userRows } = await query(
    `INSERT INTO users (name, email, password, role) VALUES
       ('Aditi Rao', 'admin@sih.demo', $1, 'admin'),
       ('Rahul Mehta', 'pm@sih.demo', $1, 'project_manager'),
       ('Sneha Kulkarni', 'engineer@sih.demo', $1, 'site_engineer')
     RETURNING id, email`,
    [passwordHash]
  );

  const admin = userRows.find((u) => u.email === "admin@sih.demo");
  const pm = userRows.find((u) => u.email === "pm@sih.demo");
  const engineer = userRows.find((u) => u.email === "engineer@sih.demo");

  console.log("Seeded users:", userRows.map((u) => u.email).join(", "));

  const { rows: projectRows } = await query(
    `INSERT INTO projects (name, code, description, location, planned_start, planned_end, manager_id, created_by)
     VALUES
       ('NH-48 Flyover Construction', 'NH48-FLY', 'Construction of a 2.4 km elevated flyover on NH-48 to ease traffic congestion.', 'Pune, Maharashtra', $1, $2, $5, $6),
       ('Riverside Metro Station', 'METRO-RVS', 'New underground metro station with 4 platforms and connecting tunnels.', 'Ahmedabad, Gujarat', $3, $4, $5, $6)
     RETURNING id, code`,
    [daysFromNow(-60), daysFromNow(120), daysFromNow(-20), daysFromNow(200), pm.id, admin.id]
  );

  const project1 = projectRows.find((p) => p.code === "NH48-FLY");
  const project2 = projectRows.find((p) => p.code === "METRO-RVS");

  const taskDefs = [
    { project: project1.id, name: "Site clearance & survey", wbsCode: "1.1", start: -60, end: -40, weight: 1, actual: 100 },
    { project: project1.id, name: "Foundation piling", wbsCode: "1.2", start: -40, end: -10, weight: 3, actual: 70 },
    { project: project1.id, name: "Pier construction", wbsCode: "1.3", start: -10, end: 30, weight: 3, actual: 15 },
    { project: project1.id, name: "Girder erection", wbsCode: "1.4", start: 30, end: 70, weight: 2, actual: 0 },
    { project: project1.id, name: "Deck slab & finishing", wbsCode: "1.5", start: 70, end: 120, weight: 2, actual: 0 },
    { project: project2.id, name: "Shaft excavation", wbsCode: "2.1", start: -20, end: 10, weight: 2, actual: 40 },
    { project: project2.id, name: "Tunnel boring", wbsCode: "2.2", start: 10, end: 90, weight: 4, actual: 0 },
    { project: project2.id, name: "Platform structure", wbsCode: "2.3", start: 90, end: 150, weight: 3, actual: 0 },
    { project: project2.id, name: "MEP & finishing", wbsCode: "2.4", start: 150, end: 200, weight: 2, actual: 0 },
  ];

  for (const def of taskDefs) {
    const plannedStart = daysFromNow(def.start);
    const plannedEnd = daysFromNow(def.end);
    const status = deriveTaskStatus({ plannedStart, plannedEnd, actualProgress: def.actual });

    const { rows } = await query(
      `INSERT INTO tasks (project_id, name, wbs_code, planned_start, planned_end, weight, assigned_to, actual_progress, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [def.project, def.name, def.wbsCode, plannedStart, plannedEnd, def.weight, engineer.id, def.actual, status, pm.id]
    );

    if (def.actual > 0) {
      await query(
        `INSERT INTO progress_updates (task_id, project_id, submitted_by, actual_progress, remarks, geotag_lat, geotag_lng, geotag_accuracy, captured_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now() - interval '2 days')`,
        [
          rows[0].id,
          def.project,
          engineer.id,
          def.actual,
          "Progress captured during routine site walk-through.",
          18.5204 + Math.random() * 0.01,
          73.8567 + Math.random() * 0.01,
          12,
        ]
      );
    }
  }

  console.log("Seeded projects, tasks and progress updates.");
  console.log("\nDemo logins:");
  console.log("  admin@sih.demo / password123 (admin)");
  console.log("  pm@sih.demo / password123 (project_manager)");
  console.log("  engineer@sih.demo / password123 (site_engineer)");

  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
