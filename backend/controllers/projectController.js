import mongoose from "mongoose";
import Project from "../models/Project.js";
import Conversation from "../models/Conversation.js";
import Version from "../models/Version.js";
import openai from "../configs/openai.js";
import { ENV } from "../env.js";
import {
  MAX_PROMPT_LENGTH,
  chargeCredits,
  cleanCode,
  friendlyError,
  refundCredits,
} from "../lib/generate.js";

// Finds a project that belongs to this user, or returns null.
// An invalid ObjectId would make Mongoose throw, so treat it as "not found".
const findOwnedProject = (projectId, userId) =>
  mongoose.isValidObjectId(projectId)
    ? Project.findOne({ _id: projectId, userId })
    : null;

const setStage = (projectId, stage) =>
  Project.updateOne({ _id: projectId }, { $set: { stage } });

export const makeRevision = async (req, res) => {
  const userId = req.userId;
  const { projectId } = req.params;
  let locked = false;
  let charged = false;

  // If the user cancels (the browser closes the request), stop the AI calls
  const controller = new AbortController();
  res.on("close", () => {
    if (!res.writableFinished) controller.abort();
  });

  try {
    const { message } = req.body;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ message: "Please enter a valid prompt" });
    }
    if (message.length > MAX_PROMPT_LENGTH) {
      return res.status(400).json({
        message: `Please keep your request under ${MAX_PROMPT_LENGTH} characters`,
      });
    }
    if (!ENV.AI_MODEL) {
      return res.status(500).json({ message: "AI_MODEL is not configured" });
    }

    // Lock the project so two revisions can't overwrite each other
    const currentProject = mongoose.isValidObjectId(projectId)
      ? await Project.findOneAndUpdate(
          {
            _id: projectId,
            userId,
            status: { $ne: "generating" },
            current_code: { $ne: null },
          },
          { $set: { status: "generating", stage: "enhancing", error: "" } },
        )
      : null;

    if (!currentProject) {
      const exists = await findOwnedProject(projectId, userId);
      return exists
        ? res
            .status(409)
            .json({ message: "Your website is still being updated, please wait" })
        : res.status(404).json({ message: "Project not found" });
    }
    locked = true;

    const user = await chargeCredits(userId);
    if (!user) {
      return res.status(403).json({
        message: "Not enough credits. Each change costs 5 credits.",
      });
    }
    charged = true;

    await Conversation.create({ role: "user", content: message, projectId });

    const promptEnhanceResponse = await openai.chat.completions.create(
      {
        model: ENV.AI_MODEL,
        messages: [
          {
            role: "system",
            content: `
                     You are a prompt enhancement specialist. The user wants to make changes to their website. Enhance their request to be more specific and actionable for a web developer.

                    Enhance this by:
                    1. Being specific about what elements to change
                    2. Mentioning design details (colors, spacing, sizes)
                    3. Clarifying the desired outcome
                    4. Using clear technical terms

                    Return ONLY the enhanced request, nothing else. Keep it concise (1-2 sentences).`,
          },
          { role: "user", content: `User's request: "${message}"` },
        ],
      },
      { signal: controller.signal },
    );

    const enhancedPrompt =
      promptEnhanceResponse?.choices?.[0]?.message?.content?.trim() || message;

    await Conversation.create({
      role: "assistant",
      content: `I've enhanced your prompt to: "${enhancedPrompt}"`,
      projectId,
    });
    await Conversation.create({
      role: "assistant",
      content: "Now making changes to your website...",
      projectId,
    });
    await setStage(projectId, "generating");

    const codeGenerationResponse = await openai.chat.completions.create(
      {
        model: ENV.AI_MODEL,
        messages: [
          {
            role: "system",
            content: `
                    You are an expert web developer.

                    CRITICAL REQUIREMENTS:
                    - Return ONLY the complete updated HTML code with the requested changes.
                    - Use Tailwind CSS for ALL styling (NO custom CSS).
                    - Use Tailwind utility classes for all styling changes.
                    - Include all JavaScript in <script> tags before closing </body>
                    - Make sure it's a complete, standalone HTML document with Tailwind CSS
                    - Return the HTML Code Only, nothing else

                    Apply the requested changes while maintaining the Tailwind CSS styling approach.`,
          },
          {
            role: "user",
            content: `
                    Here is the current website code: "${currentProject.current_code}" The user wants this change: "${enhancedPrompt}"`,
          },
        ],
      },
      { signal: controller.signal },
    );

    const code = codeGenerationResponse?.choices?.[0]?.message?.content || "";
    if (!code.trim()) {
      throw new Error("The AI returned an empty response");
    }

    await setStage(projectId, "saving");
    const finalCode = cleanCode(code);

    const version = await Version.create({
      code: finalCode,
      description: "changes made",
      projectId,
    });

    await Conversation.create({
      role: "assistant",
      content: "I've made the changes to your website! You can now preview it",
      projectId,
    });

    await Project.updateOne(
      { _id: projectId },
      {
        $set: {
          current_code: finalCode,
          current_version_index: version.id,
          status: "ready",
          stage: "",
          error: "",
        },
      },
    );
    locked = false;

    res.json({ message: "Changes made successfully", credits: user.credits });
  } catch (error) {
    console.log(error.code || error.message);
    const reason = friendlyError(error);

    try {
      if (charged) {
        await refundCredits(userId);
        charged = false;
        await Conversation.create({
          role: "assistant",
          content: `That change didn't work: ${reason}. Your credits were refunded.`,
          projectId,
        });
      }
    } catch (refundError) {
      console.log(refundError.code || refundError.message);
    }

    if (!res.headersSent && !res.destroyed) {
      res.status(500).json({ message: reason });
    }
  } finally {
    // Always release the lock, whatever happened
    if (locked) {
      try {
        await Project.updateOne(
          { _id: projectId },
          { $set: { status: "ready", stage: "" } },
        );
      } catch (unlockError) {
        console.log(unlockError.code || unlockError.message);
      }
    }
  }
};

export const rollbackToVersion = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { projectId, versionId } = req.params;

    const project = await findOwnedProject(projectId, userId);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (project.status === "generating") {
      return res
        .status(409)
        .json({ message: "Your website is being updated, please wait" });
    }

    const version = mongoose.isValidObjectId(versionId)
      ? await Version.findOne({ _id: versionId, projectId })
      : null;

    if (!version) {
      return res.status(404).json({ message: "Version not found" });
    }

    await Project.updateOne(
      { _id: projectId, userId },
      { $set: { current_code: version.code, current_version_index: version.id } },
    );

    await Conversation.create({
      role: "assistant",
      content:
        "I've rolled back your website to selected version. You can now preview it",
      projectId,
    });

    res.json({ message: "Version rolled back" });
  } catch (error) {
    console.log(error.code || error.message);
    res.status(500).json({ message: error.message });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const userId = req.userId;
    const { projectId } = req.params;

    const project = await findOwnedProject(projectId, userId);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    await Project.deleteOne({ _id: projectId, userId });
    // MongoDB has no cascade delete (Prisma did this for us), so clean up manually
    await Conversation.deleteMany({ projectId });
    await Version.deleteMany({ projectId });

    res.json({ message: "Project deleted successfully" });
  } catch (error) {
    console.log(error.code || error.message);
    res.status(500).json({ message: error.message });
  }
};

export const getProjectPreview = async (req, res) => {
  try {
    const userId = req.userId;
    const { projectId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const project = await findOwnedProject(projectId, userId);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const versions = await Version.find({ projectId });

    res.json({ project: { ...project.toJSON(), versions } });
  } catch (error) {
    console.log(error.code || error.message);
    res.status(500).json({ message: error.message });
  }
};

// Manual edits are saved as a new version, so they can always be rolled back to
export const saveProjectCode = async (req, res) => {
  try {
    const userId = req.userId;
    const { projectId } = req.params;
    const { code } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (typeof code !== "string" || !code.trim()) {
      return res.status(400).json({ message: "Code is required" });
    }

    const project = await findOwnedProject(projectId, userId);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (project.status === "generating") {
      return res
        .status(409)
        .json({ message: "Your website is being updated, please wait" });
    }

    // Nothing to do if the code is identical to the current version
    if (project.current_code === code) {
      return res.json({ message: "Already up to date" });
    }

    const version = await Version.create({
      code,
      description: "Manual edit",
      projectId,
    });

    await Project.updateOne(
      { _id: projectId },
      { $set: { current_code: code, current_version_index: version.id } },
    );

    res.json({ message: "Project saved successfully" });
  } catch (error) {
    console.log(error.code || error.message);
    res.status(500).json({ message: error.message });
  }
};

export const setPublished = async (req, res) => {
  try {
    const userId = req.userId;
    const { projectId } = req.params;
    const { published } = req.body;

    if (typeof published !== "boolean") {
      return res.status(400).json({ message: "published must be true or false" });
    }

    const project = await findOwnedProject(projectId, userId);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (published && !project.current_code) {
      return res
        .status(400)
        .json({ message: "Generate your website before publishing it" });
    }

    await Project.updateOne({ _id: projectId }, { $set: { isPublished: published } });

    res.json({ isPublished: published });
  } catch (error) {
    console.log(error.code || error.message);
    res.status(500).json({ message: error.message });
  }
};

// Public: anyone with the link can view a published site, no login needed
export const getPublishedProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = mongoose.isValidObjectId(projectId)
      ? await Project.findOne({ _id: projectId, isPublished: true })
      : null;

    if (!project || !project.current_code) {
      return res.status(404).json({ message: "This site isn't published" });
    }

    res.json({ code: project.current_code, name: project.name });
  } catch (error) {
    console.log(error.code || error.message);
    res.status(500).json({ message: error.message });
  }
};
