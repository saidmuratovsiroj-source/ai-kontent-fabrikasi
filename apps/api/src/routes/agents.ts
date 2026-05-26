import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

// GET /api/agents
router.get("/agents", async (_req: Request, res: Response) => {
  try {
    const agents = await prisma.agent.findMany({
      select: { id: true, name: true, role: true, model: true, isActive: true, systemPrompt: true },
      orderBy: { createdAt: "asc" },
    });
    res.json(agents);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Xato" });
  }
});

// PATCH /api/agents/:id — model yoki isActive o'zgartirish
router.patch("/agents/:id", async (req: Request, res: Response) => {
  const { model, isActive, systemPrompt } = req.body as {
    model?: string; isActive?: boolean; systemPrompt?: string;
  };
  try {
    const agent = await prisma.agent.update({
      where: { id: req.params.id },
      data: { ...(model !== undefined && { model }), ...(isActive !== undefined && { isActive }), ...(systemPrompt !== undefined && { systemPrompt }) },
    });
    res.json(agent);
  } catch {
    res.status(404).json({ error: "Agent topilmadi" });
  }
});

export default router;
