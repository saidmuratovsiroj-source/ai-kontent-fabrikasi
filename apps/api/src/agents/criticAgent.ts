import OpenAI from "openai";
import { z } from "zod";
import { createOpenRouterClient } from "../lib/openrouter";
import { prisma } from "../lib/prisma";

const CRITIC_ID = "00000000-0000-0000-0000-000000000003";

// ── Zod: Critic JSON javobini tekshiradi ─────────────────────────────────────
const CriticResponseSchema = z.object({
  score:               z.number().min(1).max(10),
  approved:            z.boolean(),
  strengths:           z.array(z.string()),
  issues:              z.array(z.string()),
  verdict:             z.string(),
  improvement_queries: z.array(z.string()),
});

export type CriticResult = z.infer<typeof CriticResponseSchema> & {
  agent: { id: string; name: string };
  usage: { inputTokens: number; outputTokens: number };
};

export async function runCriticAgent(
  topic: string,
  researchReport: string
): Promise<CriticResult> {
  const agent = await prisma.agent.findUnique({ where: { id: CRITIC_ID } });
  if (!agent) throw new Error("Критик агенти bazada topilmadi. Seed ni qayta ishga tushiring.");

  const openai = createOpenRouterClient();

  const response = await openai.chat.completions.create({
    model:      agent.model,
    max_tokens: 1024,
    messages: [
      { role: "system", content: agent.systemPrompt },
      {
        role: "user",
        content:
          `Тема исследования: "${topic}"\n\n` +
          `--- ОТЧЁТ ДЛЯ ПРОВЕРКИ ---\n${researchReport}\n--- КОНЕЦ ОТЧЁТА ---\n\n` +
          `Оцени отчёт строго по критериям. Верни ТОЛЬКО валидный JSON без каких-либо дополнений.`,
      },
    ],
  });

  const raw = response.choices[0].message.content ?? "{}";

  // JSON blokini tozalaymiz (ba'zan model ```json ... ``` qo'shadi)
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let parsed: z.infer<typeof CriticResponseSchema>;
  try {
    parsed = CriticResponseSchema.parse(JSON.parse(cleaned));
  } catch {
    parsed = {
      score:               4,
      approved:            false,
      strengths:           [],
      issues:              ["Critic javobini tahlil qilib bo'lmadi, qayta qidiruv kerak"],
      verdict:             "Texnik xato — qayta ishlash tavsiya etiladi",
      improvement_queries: [topic],
    };
  }

  return {
    ...parsed,
    agent: { id: agent.id, name: agent.name },
    usage: {
      inputTokens:  response.usage?.prompt_tokens    ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
    },
  };
}
