import "dotenv/config";

export const ENV = Object.freeze({
  NODE_ENV: process.env.NODE_ENV || "development",
  DATABASE_URL: process.env.DATABASE_URL || "",
  JWT_SECRET: process.env.JWT_SECRET || "",
  AI_API_KEY: process.env.AI_API_KEY || "",
  AI_MODEL: process.env.AI_MODEL || "",
  // Public URL of the frontend, used to build password reset links
  CLIENT_URL: (process.env.CLIENT_URL || "http://localhost:5173").replace(
    /\/$/,
    "",
  ),
  // Optional: send real emails through Resend (https://resend.com)
  RESEND_API_KEY: process.env.RESEND_API_KEY || "",
  MAIL_FROM: process.env.MAIL_FROM || "",
});

export const isProduction = ENV.NODE_ENV === "production";
