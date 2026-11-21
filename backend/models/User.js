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
    // Defaults to true so accounts created before email verification existed
    // keep working; register() explicitly sets it to false for new sign-ups.
    emailVerified: { type: Boolean, default: true },
    // Email verification OTP: only a hash is stored
    otpHash: { type: String, select: false },
    otpExpires: { type: Date, select: false },
    otpAttempts: { type: Number, default: 0, select: false },
    otpSentAt: { type: Date, select: false },
    // Password reset: we only store a hash of the emailed token
    resetTokenHash: { type: String, select: false },
    resetTokenExpires: { type: Date, select: false },
  },
  { timestamps: true, toJSON: { virtuals: true, versionKey: false } },
);

export default mongoose.models.User || mongoose.model("User", userSchema);
