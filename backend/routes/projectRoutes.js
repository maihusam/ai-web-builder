import express from "express";
import { protect } from "../middlewares/auth.js";
import {
  deleteProject,
  getProjectPreview,
  makeRevision,
  rollbackToVersion,
  saveProjectCode,
} from "../controllers/projectController.js";

const projectRouter = express.Router();

projectRouter.post("/revision/:projectId", protect, makeRevision);
projectRouter.put("/save/:projectId", protect, saveProjectCode);
projectRouter.get(
  "/rollback/:projectId/:versionId",
  protect,
  rollbackToVersion,
);
projectRouter.delete("/:projectId", protect, deleteProject);
projectRouter.get("/preview/:projectId", protect, getProjectPreview);

export default projectRouter;
