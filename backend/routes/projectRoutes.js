import express from "express";
import { protect } from "../middlewares/auth.js";
import {
  deleteProject,
  getCommunityProjects,
  getProjectPreview,
  getPublishedProject,
  makeRevision,
  rollbackToVersion,
  saveProjectCode,
  setPublished,
} from "../controllers/projectController.js";

const projectRouter = express.Router();

// Public: gallery of all published sites
projectRouter.get("/community", getCommunityProjects);

// Public: view a published site by its link
projectRouter.get("/published/:projectId", getPublishedProject);

projectRouter.post("/revision/:projectId", protect, makeRevision);
projectRouter.put("/save/:projectId", protect, saveProjectCode);
projectRouter.put("/publish/:projectId", protect, setPublished);
projectRouter.get(
  "/rollback/:projectId/:versionId",
  protect,
  rollbackToVersion,
);
projectRouter.delete("/:projectId", protect, deleteProject);
projectRouter.get("/preview/:projectId", protect, getProjectPreview);

export default projectRouter;
