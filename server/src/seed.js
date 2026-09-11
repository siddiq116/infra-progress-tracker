import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import mongoose from "mongoose";
import User from "./models/User.js";
import Project from "./models/Project.js";
import Task from "./models/Task.js";
import ProgressUpdate from "./models/ProgressUpdate.js";
import { deriveTaskStatus } from "./utils/progress.js";

dotenv.config();

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

async function run() {
  await connectDB();
  console.log("Clearing existing demo data...");
  await Promise.all([
    User.deleteMany({}),
    Project.deleteMany({}),
    Task.deleteMany({}),
    ProgressUpdate.deleteMany({}),
  ]);

  const admin = await User.create({
    name: "Aditi Rao",
    email: "admin@sih.demo",
    password: "password123",
    role: "admin",
  });

  const pm = await User.create({
    name: "Rahul Mehta",
    email: "pm@sih.demo",
    password: "password123",
    role: "project_manager",
  });

  const engineer = await User.create({
    name: "Sneha Kulkarni",
    email: "engineer@sih.demo",
    password: "password123",
    role: "site_engineer",
  });

  console.log("Seeded users:", [admin.email, pm.email, engineer.email].join(", "));

  const project = await Project.create({
    name: "NH-48 Flyover Construction",
    code: "NH48-FLY",
    description: "Construction of a 2.4 km elevated flyover on NH-48 to ease traffic congestion.",
    location: "Pune, Maharashtra",
    plannedStart: daysFromNow(-60),
    plannedEnd: daysFromNow(120),
    manager: pm._id,
    createdBy: admin._id,
  });

  const project2 = await Project.create({
    name: "Riverside Metro Station",
    code: "METRO-RVS",
    description: "New underground metro station with 4 platforms and connecting tunnels.",
    location: "Ahmedabad, Gujarat",
    plannedStart: daysFromNow(-20),
    plannedEnd: daysFromNow(200),
    manager: pm._id,
    createdBy: admin._id,
  });

  const taskDefs = [
    { project: project._id, name: "Site clearance & survey", wbsCode: "1.1", start: -60, end: -40, weight: 1, actual: 100 },
    { project: project._id, name: "Foundation piling", wbsCode: "1.2", start: -40, end: -10, weight: 3, actual: 70 },
    { project: project._id, name: "Pier construction", wbsCode: "1.3", start: -10, end: 30, weight: 3, actual: 15 },
    { project: project._id, name: "Girder erection", wbsCode: "1.4", start: 30, end: 70, weight: 2, actual: 0 },
    { project: project._id, name: "Deck slab & finishing", wbsCode: "1.5", start: 70, end: 120, weight: 2, actual: 0 },
    { project: project2._id, name: "Shaft excavation", wbsCode: "2.1", start: -20, end: 10, weight: 2, actual: 40 },
    { project: project2._id, name: "Tunnel boring", wbsCode: "2.2", start: 10, end: 90, weight: 4, actual: 0 },
    { project: project2._id, name: "Platform structure", wbsCode: "2.3", start: 90, end: 150, weight: 3, actual: 0 },
    { project: project2._id, name: "MEP & finishing", wbsCode: "2.4", start: 150, end: 200, weight: 2, actual: 0 },
  ];

  for (const def of taskDefs) {
    const plannedStart = daysFromNow(def.start);
    const plannedEnd = daysFromNow(def.end);
    const task = await Task.create({
      project: def.project,
      name: def.name,
      wbsCode: def.wbsCode,
      plannedStart,
      plannedEnd,
      weight: def.weight,
      assignedTo: engineer._id,
      actualProgress: def.actual,
      status: deriveTaskStatus({ plannedStart, plannedEnd, actualProgress: def.actual }),
      createdBy: pm._id,
    });

    if (def.actual > 0) {
      await ProgressUpdate.create({
        task: task._id,
        project: def.project,
        submittedBy: engineer._id,
        actualProgress: def.actual,
        remarks: "Progress captured during routine site walk-through.",
        geotag: { lat: 18.5204 + Math.random() * 0.01, lng: 73.8567 + Math.random() * 0.01, accuracy: 12 },
        capturedAt: daysFromNow(-2),
      });
    }
  }

  console.log("Seeded projects, tasks and progress updates.");
  console.log("\nDemo logins:");
  console.log("  admin@sih.demo / password123 (admin)");
  console.log("  pm@sih.demo / password123 (project_manager)");
  console.log("  engineer@sih.demo / password123 (site_engineer)");

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
