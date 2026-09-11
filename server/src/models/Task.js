import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    wbsCode: { type: String, default: "" },
    plannedStart: { type: Date, required: true },
    plannedEnd: { type: Date, required: true },
    weight: { type: Number, default: 1, min: 0 },
    dependsOn: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }],
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    actualProgress: { type: Number, default: 0, min: 0, max: 100 },
    status: {
      type: String,
      enum: ["not_started", "in_progress", "delayed", "completed"],
      default: "not_started",
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

taskSchema.index({ project: 1 });

export default mongoose.model("Task", taskSchema);
