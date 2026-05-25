import OpenAI from "openai";
import { createOpenRouterClient } from "../lib/openrouter";
import { prisma } from "../lib/prisma";

const DESIGNER_ID = "00000000-0000-0000-0000-000000000005";

export type DesignerResult = {
  agent:    { id: string; name: string };
  concepts: string;
  usage:    { inputTokens: number; outputTokens: number };
};

export async function runDesignerAgent(
  topic:  string,
  script: string
): Promise<DesignerResult> {
  const agent = await prisma.agent.findUnique({ where: { id: DESIGNER_ID } });
  if (!agent) throw new Error("Дизайнер агенти bazada topilmadi. Seed ni qayta ishga tushiring.");

  const openai = createOpenRouterClient();

  const UZBEK_INSTRUCTION =
    `MAJBURIY QOIDA: Barcha matnni faqat O'zbek tilida (lotin alifbosida) yoz. ` +
    `Mavzu qaysi tilda berilishidan qat'i nazar — thumbnail konsepsiyalari, sarlavha variantlari, ` +
    `tavsiflar va barcha bo'lim nomlari faqat o'zbekcha bo'lsin. ` +
    `Hech qanday rus yoki ingliz tilidagi so'z ishlatma.\n\n`;

  const scriptPreview = script.length > 3000 ? script.slice(0, 3000) + "\n\n[... ssenariy davomi ...]" : script;

  const response = await openai.chat.completions.create({
    model:      agent.model,
    max_tokens: 4096,
    messages: [
      { role: "system", content: UZBEK_INSTRUCTION + agent.systemPrompt },
      {
        role: "user",
        content:
          `Video mavzusi: "${topic}"\n\n` +
          `--- SSENARIY FRAGMENTI ---\n${scriptPreview}\n--- TUGADI ---\n\n` +
          `Mavzu va ssenariy asosida 3 ta thumbnail konsepsiyasi va 5 ta sarlavha varianti tayyorla. ` +
          `Barcha matn faqat o'zbek tilida (lotin alifbosida) bo'lsin. ` +
          `Tizim promptidagi formatga qat'iy amal qil.`,
      },
    ],
  });

  const concepts = response.choices[0].message.content ?? "";

  return {
    agent: { id: agent.id, name: agent.name },
    concepts,
    usage: {
      inputTokens:  response.usage?.prompt_tokens    ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
    },
  };
}
