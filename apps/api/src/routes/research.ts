import { Router, Request, Response } from "express";
import { z } from "zod";
import { runResearchAgent } from "../agents/researchAgent";
import { env } from "../config/env";

const router = Router();

const ResearchBodySchema = z.object({
  topic: z.string().min(3).max(500),
});

// POST /api/research — faqat Tadqiqotchi agenti (test/debug uchun)
router.post("/research", async (req: Request, res: Response) => {
  if (!env.openrouterApiKey) {
    res.status(503).json({ error: "OPENROUTER_API_KEY sozlanmagan" });
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
    res.status(500).json({ error: err instanceof Error ? err.message : "Noma'lum xato" });
  }
});

export default router;
