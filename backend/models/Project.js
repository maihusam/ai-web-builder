import mongoose from "../lib/db.js";

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    initial_prompt: { type: String, required: true },
    current_code: { type: String, default: null },
    current_version_index: { type: String, default: "" },
    userId: { type: String, required: true, index: true },
    // "generating" while the AI is working (first build or a revision),
    // "failed" if the first build failed, otherwise "ready"
    status: {
      type: String,
      enum: ["generating", "ready", "failed"],
      default: "ready",
    },
    // Which step the AI job is on: "enhancing" | "generating" | "saving"
    stage: { type: String, default: "" },
    error: { type: String, default: "" },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true, versionKey: false } },
);

export default mongoose.models.Project ||
  mongoose.model("Project", projectSchema);
