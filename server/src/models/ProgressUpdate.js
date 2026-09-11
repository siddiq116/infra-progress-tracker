import mongoose from "mongoose";

const progressUpdateSchema = new mongoose.Schema(
  {
    task: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    actualProgress: { type: Number, required: true, min: 0, max: 100 },
    remarks: { type: String, default: "" },
    photoUrl: { type: String, default: null },
    geotag: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      accuracy: { type: Number, default: null },
    },
    capturedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

progressUpdateSchema.index({ task: 1, capturedAt: -1 });
progressUpdateSchema.index({ project: 1, capturedAt: -1 });

export default mongoose.model("ProgressUpdate", progressUpdateSchema);
