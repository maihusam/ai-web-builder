import mongoose from "mongoose";
import User from "../models/User.js";
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

const findOwnedProject = (projectId, userId) =>
  mongoose.isValidObjectId(projectId)
    ? Project.findOne({ _id: projectId, userId })
    : null;

const setStage = (projectId, stage) =>
  Project.updateOne({ _id: projectId }, { $set: { stage } });

export const getUserCredits = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(userId);

    res.json({ credits: user?.credits });
  } catch (error) {
    console.log(error.code || error.message);
    res.status(500).json({ message: error.message });
  }
};

// Runs the whole first-build job in the background. The project's `status`
// and `stage` fields are updated as it goes, so the frontend can show real
// progress. If anything fails, the credits are refunded and the project is
// marked "failed" so the user sees an error and can retry.
const runGeneration = async (project, userId, prompt) => {
  const projectId = project.id;
  try {
    await setStage(projectId, "enhancing");

    const promptEnhanceResponse = await openai.chat.completions.create({
      model: ENV.AI_MODEL,
      messages: [
        {
          role: "system",
          content: `
                    You are a prompt enhancement specialist. Take the user's website request and expand it into a detailed, comprehensive prompt that will help create the best possible website.

                    Enhance this prompt by:
                    1. Adding specific design details (layout, color scheme, typography)
                    2. Specifying key sections and features
                    3. Describing the user experience and interactions
                    4. Including modern web design best practices
                    5. Mentioning responsive design requirements
                    6. Adding any missing but important elements

                    Return ONLY the enhanced prompt, nothing else. Make it detailed but concise (2-3 paragraphs max).`,
        },
        { role: "user", content: prompt },
      ],
    });

    const enhancedPrompt =
      promptEnhanceResponse?.choices?.[0]?.message?.content?.trim() || prompt;

    await Conversation.create({
      role: "assistant",
      content: `I've enhanced your prompt to: "${enhancedPrompt}"`,
      projectId,
    });
    await Conversation.create({
      role: "assistant",
      content: "Now generating your website...",
      projectId,
    });
    await setStage(projectId, "generating");

    const codeGenerationResponse = await openai.chat.completions.create({
      model: ENV.AI_MODEL,
      messages: [
        {
          role: "system",
          content: `
                     You are an expert web developer. Create a complete, production-ready, single-page website based on this request: "${enhancedPrompt}"

                    CRITICAL REQUIREMENTS:
                    - You MUST output valid HTML ONLY.
                    - Use Tailwind CSS for ALL styling
                    - Include this EXACT script in the <head>: <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
                    - Use Tailwind utility classes extensively for styling, animations, and responsiveness
                    - Make it fully functional and interactive with JavaScript in <script> tag before closing </body>
                    - Use modern, beautiful design with great UX using Tailwind classes
                    - Make it responsive using Tailwind responsive classes (sm:, md:, lg:, xl:)
                    - Use Tailwind animations and transitions (animate-*, transition-*)
                    - Include all necessary meta tags
                    - Use Google Fonts CDN if needed for custom fonts
                    - Use placeholder images from https://placehold.co/600x400
                    - Use Tailwind gradient classes for beautiful backgrounds
                    - Make sure all buttons, cards, and components use Tailwind styling

                    CRITICAL HARD RULES:
                    1. You MUST put ALL output ONLY into message.content.
                    2. You MUST NOT place anything in "reasoning", "analysis", "reasoning_details", or any hidden fields.
                    3. You MUST NOT include internal thoughts, explanations, analysis, comments, or markdown.
                    4. Do NOT include markdown, explanations, notes, or code fences.

                    The HTML should be complete and ready to render as-is with Tailwind CSS.`,
        },
        { role: "user", content: enhancedPrompt },
      ],
    });

    const code = codeGenerationResponse?.choices?.[0]?.message?.content || "";
    if (!code.trim()) {
      throw new Error("The AI returned an empty response");
    }

    await setStage(projectId, "saving");
    const finalCode = cleanCode(code);

    const version = await Version.create({
      code: finalCode,
      description: "Initial version",
      projectId,
    });

    await Conversation.create({
      role: "assistant",
      content:
        "I've created your website! You can now preview it and request any changes.",
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
  } catch (error) {
    console.log(error.code || error.message);
    const message = friendlyError(error);
    try {
      await refundCredits(userId);
      await Conversation.create({
        role: "assistant",
        content: `Generation failed: ${message}. Your credits were refunded, you can retry.`,
        projectId,
      });
      await Project.updateOne(
        { _id: projectId },
        { $set: { status: "failed", stage: "", error: message } },
      );
    } catch (cleanupError) {
      console.log(cleanupError.code || cleanupError.message);
    }
  }
};

export const createUserProject = async (req, res) => {
  try {
    const userId = req.userId;
    const { initial_prompt } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // A valid token can outlive a deleted account
    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!ENV.AI_MODEL) {
      return res.status(500).json({ message: "AI_MODEL is not configured" });
    }

    if (typeof initial_prompt !== "string" || !initial_prompt.trim()) {
      return res.status(400).json({ message: "initial_prompt is required" });
    }

    const trimmedPrompt = initial_prompt.trim();

    if (trimmedPrompt.length > MAX_PROMPT_LENGTH) {
      return res.status(400).json({
        message: `Please keep your description under ${MAX_PROMPT_LENGTH} characters`,
      });
    }

    const charged = await chargeCredits(userId);
    if (!charged) {
      return res
        .status(403)
        .json({ message: "Not enough credits. Creating a website costs 5 credits." });
    }

    let project;
    try {
      project = await Project.create({
        name:
          trimmedPrompt.length > 50
            ? trimmedPrompt.substring(0, 47) + "..."
            : trimmedPrompt,
        initial_prompt: trimmedPrompt,
        userId,
        status: "generating",
        stage: "enhancing",
      });

      await User.updateOne({ _id: userId }, { $inc: { totalCreation: 1 } });
      await Conversation.create({
        role: "user",
        content: trimmedPrompt,
        projectId: project.id,
      });
    } catch (error) {
      await refundCredits(userId);
      throw error;
    }

    // Reply right away; the AI work continues in the background
    res.json({ projectId: project.id, credits: charged.credits });

    runGeneration(project, userId, trimmedPrompt);
  } catch (error) {
    console.log(error.code || error.message);
    if (!res.headersSent) {
      res.status(500).json({ message: error.message });
    }
  }
};

// Lets the user re-run a build that failed, without retyping the prompt
export const retryUserProject = async (req, res) => {
  try {
    const userId = req.userId;
    const { projectId } = req.params;

    if (!ENV.AI_MODEL) {
      return res.status(500).json({ message: "AI_MODEL is not configured" });
    }

    const charged = await chargeCredits(userId);
    if (!charged) {
      return res
        .status(403)
        .json({ message: "Not enough credits. Retrying costs 5 credits." });
    }

    // Only a project that is not already running (and has no code yet) can retry
    const project = mongoose.isValidObjectId(projectId)
      ? await Project.findOneAndUpdate(
          {
            _id: projectId,
            userId,
            status: { $ne: "generating" },
            current_code: null,
          },
          { $set: { status: "generating", stage: "enhancing", error: "" } },
          { new: true },
        )
      : null;

    if (!project) {
      await refundCredits(userId);
      return res
        .status(409)
        .json({ message: "This project can't be retried right now" });
    }

    await Conversation.create({
      role: "assistant",
      content: "Retrying your website...",
      projectId,
    });

    res.json({ credits: charged.credits });

    runGeneration(project, userId, project.initial_prompt);
  } catch (error) {
    console.log(error.code || error.message);
    if (!res.headersSent) {
      res.status(500).json({ message: error.message });
    }
  }
};

// Small, cheap payload the frontend polls while the AI is working
export const getProjectStatus = async (req, res) => {
  try {
    const userId = req.userId;
    const { projectId } = req.params;

    const project = await findOwnedProject(projectId, userId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const [conversationCount, versionCount] = await Promise.all([
      Conversation.countDocuments({ projectId }),
      Version.countDocuments({ projectId }),
    ]);

    res.json({
      status: project.status,
      stage: project.stage,
      error: project.error,
      hasCode: Boolean(project.current_code),
      conversationCount,
      versionCount,
    });
  } catch (error) {
    console.log(error.code || error.message);
    res.status(500).json({ message: error.message });
  }
};

export const getUserProject = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { projectId } = req.params;

    const project = await findOwnedProject(projectId, userId);

    if (!project) {
      return res.json({ project: null });
    }

    const conversation = await Conversation.find({ projectId }).sort({
      timestamp: 1,
    });
    // The chat only needs version ids and dates, not every version's full HTML
    const versions = await Version.find({ projectId })
      .select("-code")
      .sort({ timestamp: 1 });

    res.json({ project: { ...project.toJSON(), conversation, versions } });
  } catch (error) {
    console.log(error.code || error.message);
    res.status(500).json({ message: error.message });
  }
};

export const getUserProjects = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const projects = await Project.find({ userId }).sort({ updatedAt: -1 });

    res.json({ projects });
  } catch (error) {
    console.log(error.code || error.message);
    res.status(500).json({ message: error.message });
  }
};
