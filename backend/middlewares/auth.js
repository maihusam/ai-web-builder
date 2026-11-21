import jwt from "jsonwebtoken";
import { ENV } from "../env.js";
import { COOKIE_NAME } from "../lib/token.js";

export const protect = (req, res, next) => {
  try {
    const token = req.cookies?.[COOKIE_NAME];

    if (!token) {
      return res.status(401).json({ message: "Unauthorized user" });
    }

    const payload = jwt.verify(token, ENV.JWT_SECRET);
    req.userId = payload.id;

    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};
