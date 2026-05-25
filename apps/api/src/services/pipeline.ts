import Anthropic from "@anthropic-ai/sdk";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { runResearchAgent } from "../agents/researchAgent";
import { runCriticAgent, CriticResult } from "../agents/criticAgent";

const STRATEG_ID   = "00000000-0000-0000-0000-000000000001";
const MAX_RETRIES  = 2;   // Research → Critic maksimal takrorlash soni

// ── Iteration natijasi ────────────────────────────────────────────────────────
export type IterationResult = {
  round:    number;
  research: {
    report:  string;
    queries: string[];
    usage:   { inputTokens: number; outputTokens: number };
  };
  critic: Omit<CriticResult, "agent" | "usage"> & {
    agentName: string;
    usage:     { inputTokens: number; outputTokens: number };
  };
};

export type PipelineResult = {
  userRequest:  string;
  strateg:      { plan: string; topic: string };
  iterations:   IterationResult[];
  finalReport:  string;
  approved:     boolean;
  totalRounds:  number;
  totalUsage:   { inputTokens: number; outputTokens: number };
};

// ── Стратег'dan reja va mavzu ─────────────────────────────────────────────────
async function extractPlanAndTopic(
  anthropic: Anthropic,
  systemPrompt: string,
  userRequest: string
): Promise<{ plan: string; topic: string }> {
  const response = await anthropic.messages.create({
    model:      "claude-opus-4-7",
    max_tokens: 1024,
    system:     systemPrompt,
    messages: [
      {
        role: "user",
        content:
          `Пользователь хочет создать YouTube-видео на тему: "${userRequest}"\n\n` +
          `1. Составь краткий план (2-3 предложения).\n` +
          `2. Сформулируй ОДНУ чёткую тему для глубокого исследования.\n\n` +
          `Ответь строго в формате JSON (без markdown):\n` +
          `{"plan": "...", "topic": "..."}`,
      },
    ],
  });

  const text = response.content.find((b) => b.type === "text")?.text ?? "{}";
  const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();

  try {
    const p = JSON.parse(cleaned) as { plan?: string; topic?: string };
    return {
      plan:  p.plan  ?? "Reja tuzilmoqda...",
      topic: p.topic ?? userRequest,
    };
  } catch {
    return { plan: text.slice(0, 200), topic: userRequest };
  }
}

// ── Asosiy pipeline ───────────────────────────────────────────────────────────
export async function runPipeline(userRequest: string): Promise<PipelineResult> {
  console.log("\n🚀 Pipeline boshlandi");
  console.log(`   So'rov: "${userRequest}"`);

  const strateg = await prisma.agent.findUnique({ where: { id: STRATEG_ID } });
  if (!strateg) throw new Error("Стратег bazada topilmadi.");

  const anthropic = new Anthropic({ apiKey: env.anthropicApiKey });

  // ── Qadam 1: Стратег — reja va mavzu ──────────────────────────────────────
  console.log("\n[Стратег] 🧠 Mavzuni tahlil qilmoqda...");
  const strategResult = await extractPlanAndTopic(
    anthropic,
    strateg.systemPrompt,
    userRequest
  );
  console.log(`   Reja: ${strategResult.plan.slice(0, 80)}...`);
  console.log(`   Mavzu: "${strategResult.topic}"`);

  const iterations:    IterationResult[]    = [];
  let   totalInput     = 0;
  let   totalOutput    = 0;
  let   finalReport    = "";
  let   approved       = false;
  let   searchTopic    = strategResult.topic;

  // ── Qadam 2: Research → Critic zanjiri (max MAX_RETRIES) ──────────────────
  for (let round = 1; round <= MAX_RETRIES + 1; round++) {
    console.log(`\n[Round ${round}/${MAX_RETRIES + 1}] 🔍 Исследователь: qidirmoqda...`);

    const researchResult = await runResearchAgent(searchTopic);
    totalInput  += researchResult.usage.inputTokens;
    totalOutput += researchResult.usage.outputTokens;
    console.log(`   Qidiruvlar (${researchResult.queries.length}): ${researchResult.queries.slice(0, 2).join(" | ")}...`);

    console.log(`[Round ${round}/${MAX_RETRIES + 1}] 🎯 Критик: tekshirmoqda...`);
    const criticResult = await runCriticAgent(strategResult.topic, researchResult.report);
    totalInput  += criticResult.usage.inputTokens;
    totalOutput += criticResult.usage.outputTokens;

    console.log(`   Baho: ${criticResult.score}/10 — ${criticResult.approved ? "✅ TASDIQLANDI" : "❌ QAYTArildi"}`);
    console.log(`   Verdict: ${criticResult.verdict}`);

    iterations.push({
      round,
      research: {
        report:  researchResult.report,
        queries: researchResult.queries,
        usage:   researchResult.usage,
      },
      critic: {
        score:               criticResult.score,
        approved:            criticResult.approved,
        strengths:           criticResult.strengths,
        issues:              criticResult.issues,
        verdict:             criticResult.verdict,
        improvement_queries: criticResult.improvement_queries,
        agentName:           criticResult.agent.name,
        usage:               criticResult.usage,
      },
    });

    if (criticResult.approved) {
      finalReport = researchResult.report;
      approved    = true;
      console.log(`\n✅ Hisobot tasdiqlandi (round ${round})`);
      break;
    }

    // Oxirgi round bo'lsa — qabul qilamiz (eng yaxshi natija)
    if (round === MAX_RETRIES + 1) {
      finalReport = researchResult.report;
      console.log(`\n⚠️  Max retry yetdi. Eng yaxshi natija qabul qilindi.`);
      break;
    }

    // Critic ko'rsatgan yangi qidiruvlar bilan davom etamiz
    if (criticResult.improvement_queries.length > 0) {
      searchTopic = `${strategResult.topic}. Дополнительно исследуй: ${criticResult.improvement_queries.slice(0, 2).join("; ")}`;
      console.log(`   Yangi qidiruv yo'nalishi: "${criticResult.improvement_queries[0]}"`);
    }
  }

  console.log(`\n📊 Jami: ${iterations.length} round, ${totalInput + totalOutput} token`);

  return {
    userRequest,
    strateg:     strategResult,
    iterations,
    finalReport,
    approved,
    totalRounds: iterations.length,
    totalUsage:  { inputTokens: totalInput, outputTokens: totalOutput },
  };
}
