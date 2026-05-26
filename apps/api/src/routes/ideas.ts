import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { IdeaPriority, IdeaStatus, Platform } from "@prisma/client";

const router = Router();

const CreateSchema = z.object({
  title:       z.string().min(1).max(300),
  description: z.string().max(1000).optional(),
  platform:    z.nativeEnum(Platform).default("YOUTUBE"),
  priority:    z.nativeEnum(IdeaPriority).default("ORTA"),
  projectId:   z.string().uuid().optional(),
});

const UpdateSchema = CreateSchema.partial().extend({
  status: z.nativeEnum(IdeaStatus).optional(),
});

// GET /api/ideas?projectId=...
router.get("/ideas", async (req: Request, res: Response) => {
  const { projectId } = req.query as { projectId?: string };
  try {
    const items = await prisma.idea.findMany({
      where: projectId ? { projectId } : undefined,
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Xato" });
  }
});

// POST /api/ideas
router.post("/ideas", async (req: Request, res: Response) => {
  const parsed = CreateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  try {
    const item = await prisma.idea.create({ data: parsed.data });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Xato" });
  }
});

// PATCH /api/ideas/:id
router.patch("/ideas/:id", async (req: Request, res: Response) => {
  const parsed = UpdateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  try {
    const item = await prisma.idea.update({ where: { id: req.params.id }, data: parsed.data });
    res.json(item);
  } catch {
    res.status(404).json({ error: "Ideya topilmadi" });
  }
});

// DELETE /api/ideas/:id
router.delete("/ideas/:id", async (req: Request, res: Response) => {
  try {
    await prisma.idea.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: "Ideya topilmadi" });
  }
});

export default router;
