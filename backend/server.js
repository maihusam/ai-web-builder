import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import "./lib/db.js";
import authRouter from "./routes/authRoutes.js";
import userRouter from "./routes/userRoutes.js";
import projectRouter from "./routes/projectRoutes.js";
import Project from "./models/Project.js";
import { refundCredits } from "./lib/generate.js";

const app = express();

const port = process.env.PORT || 3000;

const corsOptions = {
  origin: true,
  credentials: true,
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));

app.get("/", (req, res) => {
  res.send("Server is Live!");
});
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/project", projectRouter);

// A restart kills any AI job that was running. Without this, those projects
// would stay on "generating" forever and their credits would be lost.
const recoverStuckProjects = async () => {
  try {
    const stuck = await Project.find({ status: "generating" });
    for (const project of stuck) {
      await refundCredits(project.userId);
      const failedFirstBuild = !project.current_code;
      await Project.updateOne(
        { _id: project.id },
        {
          $set: {
            status: failedFirstBuild ? "failed" : "ready",
            stage: "",
            error: failedFirstBuild ? "The server restarted while building" : "",
          },
        },
      );
    }
    if (stuck.length) console.log(`Recovered ${stuck.length} interrupted project(s)`);
  } catch (error) {
    console.log("Could not recover interrupted projects:", error.message);
  }
};

// On Vercel every instance is short-lived and several can run at once, so a
// "generating" project may be live on another instance. Only recover locally.
if (!process.env.VERCEL) {
  recoverStuckProjects();

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

export default app;
