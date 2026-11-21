import mongoose from "mongoose";
import { ENV } from "../env.js";

if (!ENV.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Add your MongoDB connection string to .env");
}

// Top-level await works because the project uses ES modules.
// The connection is ready before any model or route uses it.
await mongoose.connect(ENV.DATABASE_URL);

export default mongoose;
