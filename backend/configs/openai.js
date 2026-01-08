import OpenAI from "openai";
import { ENV } from "../env.js";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: ENV.AI_API_KEY,
});

export default openai;
