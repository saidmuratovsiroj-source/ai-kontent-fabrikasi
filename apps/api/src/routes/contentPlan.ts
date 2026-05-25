import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { Platform, ContentPlanStatus } from "@prisma/client";

const router = Router();

const YangiContentPlanSchema = z.object({
  title:       z.string().min(2).max(200),
  platform:    z.nativeEnum(Platform),
  plannedDate: z.string().datetime(),
  status:      z.nativeEnum(ContentPlanStatus).optional(),
  runId:       z.string().uuid().optional(),
});

// GET /api/content-plan
router.get("/content-plan", async (_req: Request, res: Response) => {
  try {
    const plans = await prisma.contentPlan.findMany({
      include: { run: { select: { id: true, title: true } } },
      orderBy: { plannedDate: "asc" },
    });
    res.json(plans);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Xato" });
  }
});

// POST /api/content-plan
router.post("/content-plan", async (req: Request, res: Response) => {
  const parsed = YangiContentPlanSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const plan = await prisma.contentPlan.create({
      data: {
        title:       parsed.data.title,
        platform:    parsed.data.platform,
        plannedDate: new Date(parsed.data.plannedDate),
        status:      parsed.data.status ?? "REJALASHTIRILGAN",
        runId:       parsed.data.runId ?? null,
      },
    });
    res.status(201).json(plan);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Xato" });
  }
});

// PATCH /api/content-plan/:id
router.patch("/content-plan/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const parsed = YangiContentPlanSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const plan = await prisma.contentPlan.update({
      where: { id },
      data: {
        ...parsed.data,
        plannedDate: parsed.data.plannedDate ? new Date(parsed.data.plannedDate) : undefined,
      },
    });
    res.json(plan);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Xato" });
  }
});

// DELETE /api/content-plan/:id
router.delete("/content-plan/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.contentPlan.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Xato" });
  }
});

export default router;
