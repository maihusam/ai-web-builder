import mongoose from "../lib/db.js";

const conversationSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    projectId: { type: String, required: true, index: true },
  },
  { toJSON: { virtuals: true, versionKey: false } },
);

export default mongoose.models.Conversation ||
  mongoose.model("Conversation", conversationSchema);
