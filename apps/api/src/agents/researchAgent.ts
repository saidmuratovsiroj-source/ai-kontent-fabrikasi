import OpenAI from "openai";
import { createOpenRouterClient } from "../lib/openrouter";
import { prisma } from "../lib/prisma";
import { webSearchToolOAI, executeWebSearch } from "../lib/tools/webSearch";

const RESEARCHER_ID = "00000000-0000-0000-0000-000000000002";
const MAX_TOOL_ROUNDS = 6;

export type ResearchResult = {
  agent:   { id: string; name: string };
  report:  string;
  queries: string[];
  usage:   { inputTokens: number; outputTokens: number };
};

export async function runResearchAgent(topic: string): Promise<ResearchResult> {
  const agent = await prisma.agent.findUnique({ where: { id: RESEARCHER_ID } });
  if (!agent) throw new Error("Исследователь агенти базада topilmadi. Seed ni qayta ishga tushiring.");

  const openai = createOpenRouterClient();

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: agent.systemPrompt },
    {
      role:    "user",
      content: `Проведи глубокое исследование по теме: "${topic}"\n\nИспользуй инструмент web_search для поиска актуальных данных. Сделай 2-3 разных поисковых запроса чтобы охватить тему со всех сторон. Затем напиши структурированный отчёт.`,
    },
  ];

  let totalInput  = 0;
  let totalOutput = 0;
  const usedQueries: string[] = [];
  let finalReport = "";

  // ── Tool use loop ──────────────────────────────────────────────────────────
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const isLastRound = round === MAX_TOOL_ROUNDS - 1;

    const response = await openai.chat.completions.create({
      model:      agent.model,
      max_tokens: 4096,
      messages:   isLastRound
        ? [...messages, {
            role:    "user" as const,
            content: "Достаточно данных собрано. Напиши финальный структурированный отчёт на основе всей найденной информации. Используй предписанный формат отчёта из системного промпта.",
          }]
        : messages,
      tools: isLastRound ? undefined : [webSearchToolOAI],
    });

    totalInput  += response.usage?.prompt_tokens    ?? 0;
    totalOutput += response.usage?.completion_tokens ?? 0;

    const choice = response.choices[0];

    if (choice.finish_reason === "stop" || !choice.message.tool_calls?.length) {
      finalReport = choice.message.content ?? "";
      break;
    }

    // Assistantning javobini tarixga qo'shamiz
    messages.push({
      role:       "assistant",
      content:    choice.message.content ?? null,
      tool_calls: choice.message.tool_calls,
    });

    for (const tc of choice.message.tool_calls) {
      if (tc.type !== "function") continue;
      const toolInput = JSON.parse(tc.function.arguments) as { query: string; max_results?: number };
      usedQueries.push(toolInput.query);
      console.log(`  ⚙️  Round ${round + 1}: tool="${tc.function.name}" query="${toolInput.query}"`);

      let result: string;
      try {
        result = await executeWebSearch(toolInput);
      } catch (err) {
        result = `Qidiruv xatosi: ${err instanceof Error ? err.message : String(err)}`;
      }

      messages.push({ role: "tool", tool_call_id: tc.id, content: result });
    }
  }

  return {
    agent:   { id: agent.id, name: agent.name },
    report:  finalReport,
    queries: usedQueries,
    usage:   { inputTokens: totalInput, outputTokens: totalOutput },
  };
}
