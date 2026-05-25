import { Router, Request, Response } from "express";
import { z } from "zod";
import { env } from "../config/env";
import { createOpenRouterClient } from "../lib/openrouter";
import { prisma } from "../lib/prisma";
import { runResearchAgent } from "../agents/researchAgent";
import { runCriticAgent } from "../agents/criticAgent";
import { runScenarioAgent } from "../agents/scenarioAgent";
import { runDesignerAgent } from "../agents/designerAgent";
import { sendTelegramPost } from "../services/telegram";
import { trackUsage, calcCost } from "../services/budget";

const router = Router();

const STRATEG_ID  = "00000000-0000-0000-0000-000000000001";
const MAX_RETRIES = 2;

const BodySchema = z.object({
  userRequest: z.string().min(3).max(500),
});

function send(res: Response, event: string, data: object) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

router.post("/pipeline/stream", async (req: Request, res: Response) => {
  if (!env.openrouterApiKey) {
    res.status(503).json({ error: "OPENROUTER_API_KEY sozlanmagan" });
    return;
  }

  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  res.setHeader("Content-Type",  "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection",    "keep-alive");
  res.flushHeaders();

  const { userRequest } = parsed.data;

  try {
    send(res, "start", { message: "Pipeline boshlandi", userRequest });

    // ── 1. СТРАТЕГ — reja va tadqiqot mavzusi ──────────────────────────────
    send(res, "step", { agent: "Стратег", status: "running", message: "Mavzuni tahlil qilmoqda..." });

    const strateg = await prisma.agent.findUnique({ where: { id: STRATEG_ID } });
    if (!strateg) throw new Error("Стратег bazada topilmadi");

    const openai = createOpenRouterClient();

    let totalInputTokens  = 0;
    let totalOutputTokens = 0;
    let totalCostUsd      = 0;

    const STRATEG_MODEL = "anthropic/claude-3.5-sonnet";

    const strategRes = await openai.chat.completions.create({
      model:      STRATEG_MODEL,
      max_tokens: 1024,
      messages: [
        { role: "system", content: strateg.systemPrompt },
        {
          role: "user",
          content:
            `Пользователь хочет YouTube-видео: "${userRequest}"\n\n` +
            `1. Краткий план (2-3 предложения).\n` +
            `2. Одна чёткая тема для исследования.\n\n` +
            `JSON без markdown: {"plan": "...", "topic": "..."}`,
        },
      ],
    });

    const strategText  = strategRes.choices[0].message.content ?? "{}";
    const strategClean = strategText.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();

    let strategData: { plan: string; topic: string };
    try {
      const p = JSON.parse(strategClean) as { plan?: string; topic?: string };
      strategData = { plan: p.plan ?? "...", topic: p.topic ?? userRequest };
    } catch {
      strategData = { plan: strategClean.slice(0, 200), topic: userRequest };
    }

    const sIn  = strategRes.usage?.prompt_tokens    ?? 0;
    const sOut = strategRes.usage?.completion_tokens ?? 0;
    totalInputTokens  += sIn;
    totalOutputTokens += sOut;
    void trackUsage("strateg-plan", STRATEG_MODEL, sIn, sOut);
    totalCostUsd += calcCost(STRATEG_MODEL, sIn, sOut);

    send(res, "step", { agent: "Стратег", status: "done", message: strategData.plan, topic: strategData.topic });

    // ── 2-3. RESEARCH → CRITIC sikli ───────────────────────────────────────
    let finalReport = "";
    let approved    = false;
    let searchTopic = strategData.topic;

    for (let round = 1; round <= MAX_RETRIES + 1; round++) {
      send(res, "step", {
        agent:   "Исследователь",
        status:  "running",
        round,
        message: `Internetdan ma'lumot qidirmoqda... (Round ${round}/${MAX_RETRIES + 1})`,
      });

      const researchResult = await runResearchAgent(searchTopic);
      totalInputTokens  += researchResult.usage.inputTokens;
      totalOutputTokens += researchResult.usage.outputTokens;
      void trackUsage("research", "openai/gpt-4o-mini", researchResult.usage.inputTokens, researchResult.usage.outputTokens);
      totalCostUsd += calcCost("openai/gpt-4o-mini", researchResult.usage.inputTokens, researchResult.usage.outputTokens);

      send(res, "step", {
        agent:   "Исследователь",
        status:  "done",
        round,
        message: `${researchResult.queries.length} ta qidiruv bajarildi`,
        queries: researchResult.queries,
        preview: researchResult.report.slice(0, 400) + "...",
      });

      send(res, "step", { agent: "Критик", status: "running", round, message: "Hisobotni tekshirmoqda..." });

      const criticResult = await runCriticAgent(strategData.topic, researchResult.report);
      totalInputTokens  += criticResult.usage.inputTokens;
      totalOutputTokens += criticResult.usage.outputTokens;
      void trackUsage("critic", "openai/gpt-4o-mini", criticResult.usage.inputTokens, criticResult.usage.outputTokens);
      totalCostUsd += calcCost("openai/gpt-4o-mini", criticResult.usage.inputTokens, criticResult.usage.outputTokens);

      send(res, "step", {
        agent:    "Критик",
        status:   criticResult.approved ? "approved" : "rejected",
        round,
        score:    criticResult.score,
        approved: criticResult.approved,
        verdict:  criticResult.verdict,
        issues:   criticResult.issues,
      });

      if (criticResult.approved) {
        finalReport = researchResult.report;
        approved    = true;
        break;
      }

      if (round === MAX_RETRIES + 1) {
        finalReport = researchResult.report;
        break;
      }

      if (criticResult.improvement_queries.length > 0) {
        searchTopic = `${strategData.topic}. Дополнительно: ${criticResult.improvement_queries.slice(0, 2).join("; ")}`;
      }
    }

    // ── 4. СЦЕНАРИСТ — video ssenariy ──────────────────────────────────────
    send(res, "step", {
      agent:   "Сценарист",
      status:  "running",
      message: "Tadqiqot asosida video ssenariysini yozmoqda...",
    });

    let script = "";
    try {
      const scenarioResult = await runScenarioAgent(strategData.topic, finalReport);
      script = scenarioResult.script ?? "";
      totalInputTokens  += scenarioResult.usage.inputTokens;
      totalOutputTokens += scenarioResult.usage.outputTokens;
      void trackUsage("scenario", "anthropic/claude-3.5-sonnet", scenarioResult.usage.inputTokens, scenarioResult.usage.outputTokens);
      totalCostUsd += calcCost("anthropic/claude-3.5-sonnet", scenarioResult.usage.inputTokens, scenarioResult.usage.outputTokens);

      send(res, "step", {
        agent:   "Сценарист",
        status:  "done",
        message: `Ssenariy tayyor — ${script.length} belgi`,
        preview: script.slice(0, 500) + (script.length > 500 ? "..." : ""),
      });
    } catch (scenarioErr) {
      const msg = scenarioErr instanceof Error ? scenarioErr.message : "Noma'lum xato";
      console.error("[Сценарист] xato:", msg);
      send(res, "step", {
        agent:   "Сценарист",
        status:  "error",
        message: `Ssenariy xatosi: ${msg} — pipeline davom etmoqda`,
      });
    }

    // ── 5. ДИЗАЙНЕР — thumbnail konsepsiyalari ─────────────────────────────
    send(res, "step", {
      agent:   "Дизайнер",
      status:  "running",
      message: "Ssenariy asosida thumbnail konsepsiyalarini yaratmoqda...",
    });

    let thumbnail = "";
    try {
      const designerResult = await runDesignerAgent(strategData.topic, script);
      thumbnail = designerResult.concepts ?? "";
      totalInputTokens  += designerResult.usage.inputTokens;
      totalOutputTokens += designerResult.usage.outputTokens;
      void trackUsage("designer", "openai/gpt-4o-mini", designerResult.usage.inputTokens, designerResult.usage.outputTokens);
      totalCostUsd += calcCost("openai/gpt-4o-mini", designerResult.usage.inputTokens, designerResult.usage.outputTokens);

      send(res, "step", {
        agent:   "Дизайнер",
        status:  "done",
        message: "3 ta thumbnail konsepsiyasi va 5 ta sarlavha tayyorlandi",
        preview: thumbnail.slice(0, 400) + (thumbnail.length > 400 ? "..." : ""),
      });
    } catch (designerErr) {
      const msg = designerErr instanceof Error ? designerErr.message : "Noma'lum xato";
      console.error("[Дизайнер] xato:", msg);
      send(res, "step", {
        agent:   "Дизайнер",
        status:  "error",
        message: `Dizayner xatosi: ${msg} — pipeline davom etmoqda`,
      });
    }

    // ── DB GA SAQLASH (runs jadvali) ───────────────────────────────────────
    const costUsd = Math.round(totalCostUsd * 10000) / 10000;
    try {
      await prisma.run.create({
        data: {
          title:  strategData.topic.slice(0, 200),
          status: script || thumbnail ? "COMPLETED" : "FAILED",
          input:  userRequest,
          output: JSON.stringify({
            plan:      strategData.plan,
            topic:     strategData.topic,
            report:    finalReport,
            script,
            thumbnail,
            costUsd,
            approved,
          }),
        },
      });
    } catch (dbErr) {
      console.error("[DB] Run saqlanmadi:", dbErr instanceof Error ? dbErr.message : dbErr);
    }

    // ── TELEGRAM (DB dan keyin, mustaqil) ─────────────────────────────────
    try {
      await sendTelegramPost({ topic: strategData.topic, plan: strategData.plan, script, thumbnail });
    } catch (tgErr) {
      console.error("[Telegram] xato:", tgErr instanceof Error ? tgErr.message : tgErr);
    }

    // ── YAKUNIY NATIJA ─────────────────────────────────────────────────────
    send(res, "done", {
      approved,
      plan:        strategData.plan,
      topic:       strategData.topic,
      finalReport,
      script,
      thumbnail,
      costUsd,
    });

  } catch (err) {
    send(res, "error", { message: err instanceof Error ? err.message : "Noma'lum xato" });
  } finally {
    res.end();
  }
});

export default router;
