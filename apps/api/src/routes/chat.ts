import { Router, Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";

const router = Router();

const STRATEG_ID = "00000000-0000-0000-0000-000000000001";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

router.post("/chat", async (req: Request, res: Response) => {
  const { messages, agentId = STRATEG_ID } = req.body as {
    messages: ChatMessage[];
    agentId?: string;
  };

  if (!env.anthropicApiKey) {
    res.status(503).json({
      error: "ANTHROPIC_API_KEY .env faylida sozlanmagan",
    });
    return;
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages massivi bo'sh bo'lmasligi kerak" });
    return;
  }

  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent) {
    res.status(404).json({ error: `Agent topilmadi: ${agentId}` });
    return;
  }

  const anthropic = new Anthropic({ apiKey: env.anthropicApiKey });

  try {
    const aiResponse = await anthropic.messages.create({
      model: agent.model,
      max_tokens: 4096,
      system: agent.systemPrompt,
      messages,
    });

    const replyText =
      aiResponse.content[0]?.type === "text" ? aiResponse.content[0].text : "";

    res.json({
      agent: { id: agent.id, name: agent.name, role: agent.role },
      message: { role: "assistant", content: replyText },
      usage: {
        inputTokens:  aiResponse.usage.input_tokens,
        outputTokens: aiResponse.usage.output_tokens,
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Noma'lum xato";
    const status =
      (err as { status?: number }).status ?? 500;
    res.status(status < 500 ? status : 502).json({ error: message });
  }
});

export default router;
