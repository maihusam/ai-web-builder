import mongoose from "../lib/db.js";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // select:false means the hash is never returned unless asked for explicitly
    password: { type: String, required: true, select: false },
    credits: { type: Number, default: 20 },
    totalCreation: { type: Number, default: 0 },
    // Password reset: we only store a hash of the emailed token
    resetTokenHash: { type: String, select: false },
    resetTokenExpires: { type: Date, select: false },
  },
  { timestamps: true, toJSON: { virtuals: true, versionKey: false } },
);

export default mongoose.models.User || mongoose.model("User", userSchema);
