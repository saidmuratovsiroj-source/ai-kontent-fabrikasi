import { Router, Request, Response } from "express";
import { z } from "zod";
import { env } from "../config/env";
import { createOpenRouterClient } from "../lib/openrouter";
import { createApproval, resolveApproval } from "../lib/approvalQueue";
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
  budgetLimit: z.number().min(0.10).max(5.00).optional(),
});

function send(res: Response, event: string, data: object) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

// ── POST /api/pipeline/approve — foydalanuvchi tasdiqlash javobi ──────────────
router.post("/pipeline/approve", (req: Request, res: Response) => {
  const { approvalId, action } = req.body as { approvalId?: string; action?: string };
  if (!approvalId || !action) {
    res.status(400).json({ error: "approvalId va action kerak" });
    return;
  }
  if (!["approve", "edit", "cancel"].includes(action)) {
    res.status(400).json({ error: "action: approve | edit | cancel" });
    return;
  }
  const ok = resolveApproval(approvalId, action as "approve" | "edit" | "cancel");
  res.json({ ok });
});

// ── POST /api/pipeline/stream ─────────────────────────────────────────────────
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

  const { userRequest, budgetLimit } = parsed.data;
  let activeBudget: number | undefined = budgetLimit;

  // Byudjet chegasiga yetildi → foydalanuvchidan ruxsat so'raydi
  async function budgetTekshir(cost: number): Promise<boolean> {
    if (activeBudget === undefined || cost < activeBudget) return true; // davom
    const { approvalId, promise } = createApproval();
    send(res, "budget_warning", {
      approvalId,
      message: `Byudjet chegasiga yetdi: $${cost.toFixed(4)} / $${activeBudget.toFixed(2)}`,
      spent:   cost,
      limit:   activeBudget,
    });
    const action = await promise;
    if (action === "cancel") return false; // toxtat
    activeBudget = undefined; // foydalanuvchi rozilik berdi — chekni o'chiramiz
    return true;
  }

  let topic      = userRequest;
  let plan       = "";
  let finalReport = "";
  let script     = "";
  let thumbnail  = "";
  let approved   = false;
  let totalCostUsd = 0;

  try {
    send(res, "start", { message: "Pipeline boshlandi", userRequest });

    // ── 1. STRATEG ────────────────────────────────────────────────────────
    send(res, "step", { agent: "Стратег", status: "running", message: "Mavzuni tahlil qilmoqda..." });

    const strateg = await prisma.agent.findUnique({ where: { id: STRATEG_ID } });
    if (!strateg) throw new Error("Strateg bazada topilmadi");

    const openai        = createOpenRouterClient();
    const STRATEG_MODEL = "anthropic/claude-3.5-sonnet";

    const strategRes = await openai.chat.completions.create({
      model:      STRATEG_MODEL,
      max_tokens: 1024,
      messages: [
        { role: "system", content: strateg.systemPrompt },
        {
          role:    "user",
          content: `Foydalanuvchi YouTube-video yaratmoqchi: "${userRequest}"\n\n` +
                   `1. Qisqa reja (2-3 jumla).\n2. Tadqiqot uchun bitta aniq mavzu.\n\n` +
                   `JSON (markdown'siz): {"plan": "...", "topic": "..."}`,
        },
      ],
    });

    const strategText  = strategRes.choices[0].message.content ?? "{}";
    const strategClean = strategText.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();

    try {
      const p = JSON.parse(strategClean) as { plan?: string; topic?: string };
      plan  = p.plan  ?? strategClean.slice(0, 200);
      topic = p.topic ?? userRequest;
    } catch {
      plan  = strategClean.slice(0, 200);
      topic = userRequest;
    }

    const sIn = strategRes.usage?.prompt_tokens ?? 0, sOut = strategRes.usage?.completion_tokens ?? 0;
    void trackUsage("strateg-plan", STRATEG_MODEL, sIn, sOut);
    totalCostUsd += calcCost(STRATEG_MODEL, sIn, sOut);

    send(res, "step", { agent: "Стратег", status: "done", message: plan, topic });

    if (!await budgetTekshir(totalCostUsd)) {
      send(res, "cancelled", { message: "Byudjet — foydalanuvchi to'xtatdi" }); res.end(); return;
    }

    // ── 2-3. TADQIQOTCHI → TANQIDCHI sikli ───────────────────────────────
    let searchTopic = topic;

    for (let round = 1; round <= MAX_RETRIES + 1; round++) {
      send(res, "step", {
        agent: "Исследователь", status: "running", round,
        message: `Internet qidirmoqda... (${round}/${MAX_RETRIES + 1})`,
      });

      const researchResult = await runResearchAgent(searchTopic);
      void trackUsage("research", "openai/gpt-4o-mini", researchResult.usage.inputTokens, researchResult.usage.outputTokens);
      totalCostUsd += calcCost("openai/gpt-4o-mini", researchResult.usage.inputTokens, researchResult.usage.outputTokens);

      send(res, "step", {
        agent:   "Исследователь", status: "done", round,
        message: `${researchResult.queries.length} ta qidiruv bajarildi`,
        queries: researchResult.queries,
        preview: researchResult.report.slice(0, 400) + "...",
      });

      if (!await budgetTekshir(totalCostUsd)) {
        send(res, "cancelled", { message: "Byudjet — foydalanuvchi to'xtatdi" }); res.end(); return;
      }

      send(res, "step", { agent: "Критик", status: "running", round, message: "Hisobotni tekshirmoqda..." });

      const criticResult = await runCriticAgent(topic, researchResult.report);
      void trackUsage("critic", "openai/gpt-4o-mini", criticResult.usage.inputTokens, criticResult.usage.outputTokens);
      totalCostUsd += calcCost("openai/gpt-4o-mini", criticResult.usage.inputTokens, criticResult.usage.outputTokens);

      send(res, "step", {
        agent:    "Критик",
        status:   criticResult.approved ? "approved" : "rejected",
        round,    score:    criticResult.score,
        approved: criticResult.approved,
        verdict:  criticResult.verdict,
        issues:   criticResult.issues,
      });

      if (criticResult.approved) { finalReport = researchResult.report; approved = true; break; }
      if (round === MAX_RETRIES + 1) { finalReport = researchResult.report; break; }
      if (criticResult.improvement_queries.length > 0) {
        searchTopic = `${topic}. Qo'shimcha: ${criticResult.improvement_queries.slice(0, 2).join("; ")}`;
      }
    }

    if (!await budgetTekshir(totalCostUsd)) {
      send(res, "cancelled", { message: "Byudjet — foydalanuvchi to'xtatdi" }); res.end(); return;
    }

    // ── 4. SSENARIST ─────────────────────────────────────────────────────
    send(res, "step", { agent: "Сценарист", status: "running", message: "Video ssenariy yozmoqda..." });
    try {
      const r = await runScenarioAgent(topic, finalReport);
      script = r.script ?? "";
      void trackUsage("scenario", "anthropic/claude-3.5-sonnet", r.usage.inputTokens, r.usage.outputTokens);
      totalCostUsd += calcCost("anthropic/claude-3.5-sonnet", r.usage.inputTokens, r.usage.outputTokens);
      send(res, "step", {
        agent: "Сценарист", status: "done",
        message: `Ssenariy tayyor — ${script.length} belgi`,
        preview: script.slice(0, 500) + (script.length > 500 ? "..." : ""),
      });
    } catch (e) {
      send(res, "step", { agent: "Сценарист", status: "error", message: `Xato: ${e instanceof Error ? e.message : e}` });
    }

    if (!await budgetTekshir(totalCostUsd)) {
      send(res, "cancelled", { message: "Byudjet — foydalanuvchi to'xtatdi" }); res.end(); return;
    }

    // ── 5. DIZAYNER ───────────────────────────────────────────────────────
    send(res, "step", { agent: "Дизайнер", status: "running", message: "Thumbnail konsepsiyalarini yaratmoqda..." });
    try {
      const r = await runDesignerAgent(topic, script);
      thumbnail = r.concepts ?? "";
      void trackUsage("designer", "openai/gpt-4o-mini", r.usage.inputTokens, r.usage.outputTokens);
      totalCostUsd += calcCost("openai/gpt-4o-mini", r.usage.inputTokens, r.usage.outputTokens);
      send(res, "step", {
        agent: "Дизайнер", status: "done",
        message: "3 ta thumbnail konsepsiyasi va 5 ta sarlavha tayyorlandi",
        preview: thumbnail.slice(0, 400) + (thumbnail.length > 400 ? "..." : ""),
      });
    } catch (e) {
      send(res, "step", { agent: "Дизайнер", status: "error", message: `Xato: ${e instanceof Error ? e.message : e}` });
    }

    // ── 6. INSON TASDIQLASH — Telegram'ga yuborishdan oldin ───────────────
    if (script || thumbnail) {
      const { approvalId, promise } = createApproval();
      send(res, "approval_needed", {
        approvalId,
        stage:   "yakuniy_tasdiqlash",
        message: "Kontent tayyor. Telegram'ga yuborib, saqlab qo'ysizmi?",
        preview: script.slice(0, 600),
        costUsd: Math.round(totalCostUsd * 10000) / 10000,
      });

      const approvalAction = await promise;

      if (approvalAction === "cancel") {
        send(res, "cancelled", { message: "Foydalanuvchi bekor qildi — kontent saqlanmadi" });
        res.end();
        return;
      }
      // "approve" yoki "edit" — saqlash va Telegram'ga yuborish davom etadi
    }

    // ── DB GA SAQLASH ─────────────────────────────────────────────────────
    const costUsd = Math.round(totalCostUsd * 10000) / 10000;
    try {
      await prisma.run.create({
        data: {
          title:       topic.slice(0, 200),
          status:      script || thumbnail ? "COMPLETED" : "FAILED",
          input:       userRequest,
          budgetLimit: budgetLimit ?? null,
          budgetSpent: costUsd,
          output: JSON.stringify({ plan, topic, report: finalReport, script, thumbnail, costUsd, approved }),
        },
      });
    } catch (dbErr) {
      console.error("[DB] Run saqlanmadi:", dbErr instanceof Error ? dbErr.message : dbErr);
    }

    // ── TELEGRAM ──────────────────────────────────────────────────────────
    try {
      await sendTelegramPost({ topic, plan, script, thumbnail });
    } catch (tgErr) {
      console.error("[Telegram] xato:", tgErr instanceof Error ? tgErr.message : tgErr);
    }

    // ── YAKUNIY NATIJA ────────────────────────────────────────────────────
    send(res, "done", {
      approved, plan, topic, finalReport, script, thumbnail, costUsd,
      budgetLimit: budgetLimit ?? null,
    });

  } catch (err) {
    send(res, "error", { message: err instanceof Error ? err.message : "Noma'lum xato" });
  } finally {
    res.end();
  }
});

export default router;
