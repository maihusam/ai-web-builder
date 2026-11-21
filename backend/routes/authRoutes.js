import express from "express";
import {
  register,
  login,
  logout,
  me,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";
import { protect } from "../middlewares/auth.js";

const authRouter = express.Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/logout", logout);
authRouter.post("/forgot", forgotPassword);
authRouter.post("/reset", resetPassword);
authRouter.get("/me", protect, me);

export default authRouter;
