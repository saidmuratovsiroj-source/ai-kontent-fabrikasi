import OpenAI from "openai";
import { env } from "../config/env";

export function createOpenRouterClient(): OpenAI {
  return new OpenAI({
    apiKey:  env.openrouterApiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": "https://github.com/ai-kontent-fabrikasi",
      "X-Title":      "AI Kontent Fabrikasi",
    },
  });
}
