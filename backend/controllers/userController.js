import prisma from "../lib/prisma.js";
import openai from "../configs/openai.js";
import { ENV } from "../env.js";

export const getUserCredits = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    res.json({ credits: user?.credits });
  } catch (error) {
    console.log(error.code || error.message);
    res.status(500).json({ message: error.message });
  }
};

export const createUserProject = async (req, res) => {
  const userId = req.userId;
  let creditsDeducted = false;
  try {
    const { initial_prompt } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (user && user.credits < 5) {
      return res
        .status(403)
        .json({ message: "add credits to create more projects" });
    }

    if (!initial_prompt || typeof initial_prompt !== "string") {
      return res.status(400).json({ message: "initial_prompt is required" });
    }

    const trimmedPrompt = initial_prompt.trim();

    if (!trimmedPrompt) {
      return res.status(400).json({ message: "initial_prompt is required" });
    }

    const project = await prisma.websiteProject.create({
      data: {
        name:
          trimmedPrompt.length > 50
            ? trimmedPrompt.substring(0, 47) + "..."
            : trimmedPrompt,
        initial_prompt: trimmedPrompt,
        userId,
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { totalCreation: { increment: 1 } },
    });

    await prisma.conversation.create({
      data: {
        role: "user",
        content: trimmedPrompt,
        projectId: project.id,
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { credits: { decrement: 5 } },
    });
    creditsDeducted = true;

    res.json({ projectId: project.id });

    if (!ENV.AI_MODEL) {
      return res.status(500).json({ message: "AI_MODEL is not configured" });
    }

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
        {
          role: "user",
          content: initial_prompt,
        },
      ],
    });

    const enhancedPrompt =
      promptEnhanceResponse?.choices?.[0]?.message?.content?.trim() ||
      trimmedPrompt;

    await prisma.conversation.create({
      data: {
        role: "assistant",
        content: `I've enhanced your prompt to: "${enhancedPrompt}"`,
        projectId: project.id,
      },
    });

    await prisma.conversation.create({
      data: {
        role: "assistant",
        content: "now generating your website...",
        projectId: project.id,
      },
    });

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
        {
          role: "user",
          content: enhancedPrompt || "",
        },
      ],
    });

    const code =
      codeGenerationResponse?.choices?.[0]?.message?.content?.trim() || "";

    if (!code) {
      await prisma.conversation.create({
        data: {
          role: "assistant",
          content: "Unable to generate the code, please try again",
          projectId: project.id,
        },
      });
      await prisma.user.update({
        where: { id: userId },
        data: { credits: { increment: 5 } },
      });
      creditsDeducted = false;
      return;
    }

    const version = await prisma.version.create({
      data: {
        code: code
          .replace(/```[a-z]*\n?/gi, "")
          .replace(/```$/g, "")
          .trim(),
        description: "Initial version",
        projectId: project.id,
      },
    });

    await prisma.conversation.create({
      data: {
        role: "assistant",
        content:
          "I've created your website! You can now preview it and request any changes.",
        projectId: project.id,
      },
    });

    await prisma.websiteProject.update({
      where: { id: project.id },
      data: {
        current_code: code
          .replace(/```[a-z]*\n?/gi, "")
          .replace(/```$/g, "")
          .trim(),
        current_version_index: version.id,
      },
    });
  } catch (error) {
    if (creditsDeducted && userId) {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { credits: { increment: 5 } },
        });
      } catch (refundError) {
        console.log(refundError.code || refundError.message);
      }
    }

    console.log(error.code || error.message);

    if (!res.headersSent) {
      res.status(500).json({ message: error.message });
    }
  }
};

export const getUserProject = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { projectId } = req.params;

    const project = await prisma.websiteProject.findUnique({
      where: { id: projectId, userId },
      include: {
        conversation: {
          orderBy: { timestamp: "asc" },
        },
        versions: { orderBy: { timestamp: "asc" } },
      },
    });

    res.json({ project });
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

    const projects = await prisma.websiteProject.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });

    res.json({ projects });
  } catch (error) {
    console.log(error.code || error.message);
    res.status(500).json({ message: error.message });
  }
};
