import express from "express";
import {
  createUserProject,
  getProjectStatus,
  getUserCredits,
  getUserProject,
  getUserProjects,
  retryUserProject,
} from "../controllers/userController.js";
import { protect } from "../middlewares/auth.js";

const userRouter = express.Router();

userRouter.get("/credits", protect, getUserCredits);
userRouter.post("/project", protect, createUserProject);
userRouter.post("/project/:projectId/retry", protect, retryUserProject);
userRouter.get("/project/:projectId/status", protect, getProjectStatus);
userRouter.get("/project/:projectId", protect, getUserProject);
userRouter.get("/projects", protect, getUserProjects);

export default userRouter;
