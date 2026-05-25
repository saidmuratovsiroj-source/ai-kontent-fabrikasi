import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import type OpenAI from "openai";
import { env } from "../../config/env";

// ── Zod sxemasi: Claude yuboradigan tool input ni tekshiradi ─────────────────
export const WebSearchInputSchema = z.object({
  query:       z.string().min(2).max(300).describe("Поисковый запрос"),
  max_results: z.number().int().min(1).max(10).default(5),
});

export type WebSearchInput = z.infer<typeof WebSearchInputSchema>;

// ── Anthropic tool ta'rifi (Claude uchun) ───────────────────────────────────
export const webSearchTool: Anthropic.Tool = {
  name: "web_search",
  description:
    "Поиск актуальной информации в интернете. " +
    "Используй для получения свежих данных, статистики, фактов и новостей по заданной теме. " +
    "Делай конкретные запросы на русском или английском языке.",
  input_schema: {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description: "Поисковый запрос (на русском или английском)",
      },
      max_results: {
        type: "number",
        description: "Количество результатов (1–10, по умолчанию 5)",
      },
    },
    required: ["query"],
  },
};

// ── OpenAI / OpenRouter tool ta'rifi ────────────────────────────────────────
export const webSearchToolOAI: OpenAI.ChatCompletionTool = {
  type: "function",
  function: {
    name: "web_search",
    description:
      "Поиск актуальной информации в интернете. " +
      "Используй для получения свежих данных, статистики, фактов и новостей по заданной теме. " +
      "Делай конкретные запросы на русском или английском языке.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Поисковый запрос (на русском или английском)",
        },
        max_results: {
          type: "number",
          description: "Количество результатов (1–10, по умолчанию 5)",
        },
      },
      required: ["query"],
    },
  },
};

// ── Tavily qidiruvchi ────────────────────────────────────────────────────────
async function searchWithTavily(input: WebSearchInput): Promise<string> {
  const res = await fetch("https://api.tavily.com/search", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key:      env.tavilyApiKey,
      query:        input.query,
      search_depth: "basic",
      max_results:  input.max_results,
      include_answer: true,
    }),
  });

  if (!res.ok) throw new Error(`Tavily xatosi: ${res.status}`);
  const data = await res.json() as {
    answer?: string;
    results: Array<{ title: string; url: string; content: string }>;
  };

  const parts: string[] = [];
  if (data.answer) parts.push(`📌 Краткий ответ: ${data.answer}\n`);

  data.results.forEach((r, i) => {
    parts.push(`${i + 1}. **${r.title}**\n   ${r.content.slice(0, 300)}...\n   🔗 ${r.url}`);
  });

  return parts.join("\n\n") || "Результаты не найдены.";
}

// ── DuckDuckGo fallback (API kalitsiz) ──────────────────────────────────────
async function searchWithDuckDuckGo(input: WebSearchInput): Promise<string> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(input.query)}&format=json&no_html=1&skip_disambig=1`;
  const res  = await fetch(url, { headers: { "User-Agent": "AI-Kontent-Fabrikasi/1.0" } });

  if (!res.ok) throw new Error(`DDG xatosi: ${res.status}`);
  const data = await res.json() as {
    AbstractText: string;
    AbstractURL:  string;
    RelatedTopics: Array<{ Text?: string; FirstURL?: string }>;
  };

  const parts: string[] = [`🔍 Запрос: "${input.query}"\n`];

  if (data.AbstractText) {
    parts.push(`📌 Краткое описание:\n${data.AbstractText}\n🔗 ${data.AbstractURL}`);
  }

  const topics = data.RelatedTopics
    .filter((t) => t.Text)
    .slice(0, input.max_results);

  if (topics.length > 0) {
    parts.push("\n📚 Связанные темы:");
    topics.forEach((t, i) => {
      parts.push(`${i + 1}. ${t.Text?.slice(0, 200)}${t.FirstURL ? `\n   🔗 ${t.FirstURL}` : ""}`);
    });
  }

  return parts.join("\n\n") || "Результаты не найдены по данному запросу.";
}

// ── Asosiy funksiya: Tavily bor → Tavily, yo'q → DDG ────────────────────────
export async function executeWebSearch(rawInput: unknown): Promise<string> {
  const input = WebSearchInputSchema.parse(rawInput);

  console.log(`  🔍 web_search: "${input.query}" (max: ${input.max_results})`);

  if (env.tavilyApiKey) {
    return searchWithTavily(input);
  }
  return searchWithDuckDuckGo(input);
}
