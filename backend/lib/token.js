import jwt from "jsonwebtoken";
import { ENV, isProduction } from "../env.js";

export const COOKIE_NAME = "auth_session";

export const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export const signToken = (userId) =>
  jwt.sign({ id: userId }, ENV.JWT_SECRET, { expiresIn: "7d" });
