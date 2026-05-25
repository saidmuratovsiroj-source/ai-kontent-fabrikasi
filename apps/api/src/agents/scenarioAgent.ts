import OpenAI from "openai";
import { createOpenRouterClient } from "../lib/openrouter";
import { prisma } from "../lib/prisma";

const SCENARIST_ID = "00000000-0000-0000-0000-000000000004";

export type ScenarioResult = {
  agent:    { id: string; name: string };
  script:   string;
  usage:    { inputTokens: number; outputTokens: number };
};

export async function runScenarioAgent(
  topic:          string,
  researchReport: string
): Promise<ScenarioResult> {
  const agent = await prisma.agent.findUnique({ where: { id: SCENARIST_ID } });
  if (!agent) throw new Error("Сценарист агенти bazada topilmadi. Seed ni qayta ishga tushiring.");

  const openai = createOpenRouterClient();

  const UZBEK_INSTRUCTION =
    `MAJBURIY QOIDA: Barcha matnni faqat O'zbek tilida (lotin alifbosida) yoz. ` +
    `Mavzu qaysi tilda berilishidan qat'i nazar — ssenariyning sarlavhasi, kirish qismi, ` +
    `asosiy mazmuni, xulosa va barcha bo'lim nomlari faqat o'zbekcha bo'lsin. ` +
    `Hech qanday rus yoki ingliz tilidagi so'z ishlatma.\n\n`;

  const response = await openai.chat.completions.create({
    model:      agent.model,
    max_tokens: 8192,
    messages: [
      { role: "system", content: UZBEK_INSTRUCTION + agent.systemPrompt },
      {
        role: "user",
        content:
          `Video mavzusi: "${topic}"\n\n` +
          `--- TADQIQOT HISOBOTI ---\n${researchReport}\n--- HISOBOT TUGADI ---\n\n` +
          `Ushbu ma'lumotlar asosida YouTube-video uchun to'liq professional ssenariy yoz. ` +
          `Barcha matn faqat o'zbek tilida (lotin alifbosida) bo'lsin. ` +
          `Tizim promptidagi formatga qat'iy amal qil.`,
      },
    ],
  });

  const script = response.choices[0].message.content ?? "";

  return {
    agent: { id: agent.id, name: agent.name },
    script,
    usage: {
      inputTokens:  response.usage?.prompt_tokens    ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
    },
  };
}
