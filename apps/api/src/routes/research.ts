import { Router, Request, Response } from "express";
import { z } from "zod";
import { runResearchAgent } from "../agents/researchAgent";
import { runPipeline } from "../services/pipeline";
import { env } from "../config/env";

const router = Router();

const ResearchBodySchema = z.object({
  topic: z.string().min(3).max(500),
});

const PipelineBodySchema = z.object({
  userRequest: z.string().min(3).max(500),
});

// POST /api/research — faqat Research Agent
router.post("/research", async (req: Request, res: Response) => {
  if (!env.anthropicApiKey) {
    res.status(503).json({ error: "ANTHROPIC_API_KEY sozlanmagan" });
    return;
  }

  const parsed = ResearchBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  try {
    const result = await runResearchAgent(parsed.data.topic);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Noma'lum xato";
    res.status(500).json({ error: message });
  }
});

// POST /api/pipeline — Стратег + Research (to'liq zanjir)
router.post("/pipeline", async (req: Request, res: Response) => {
  if (!env.anthropicApiKey) {
    res.status(503).json({ error: "ANTHROPIC_API_KEY sozlanmagan" });
    return;
  }

  const parsed = PipelineBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  try {
    const result = await runPipeline(parsed.data.userRequest);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Noma'lum xato";
    res.status(500).json({ error: message });
  }
});

export default router;
