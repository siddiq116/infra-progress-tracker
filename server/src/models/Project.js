import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    description: { type: String, default: "" },
    location: { type: String, default: "" },
    plannedStart: { type: Date, required: true },
    plannedEnd: { type: Date, required: true },
    status: {
      type: String,
      enum: ["planned", "in_progress", "delayed", "completed", "on_hold"],
      default: "planned",
    },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Project", projectSchema);
