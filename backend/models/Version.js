import mongoose from "../lib/db.js";

const versionSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    description: { type: String, default: null },
    timestamp: { type: Date, default: Date.now },
    projectId: { type: String, required: true, index: true },
  },
  { toJSON: { virtuals: true, versionKey: false } },
);

export default mongoose.models.Version ||
  mongoose.model("Version", versionSchema);
