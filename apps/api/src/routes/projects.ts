import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const router = Router();

const CreateSchema = z.object({
  name:        z.string().min(1).max(100),
  emoji:       z.string().max(8).default("📁"),
  description: z.string().max(500).optional(),
});

const UpdateSchema = CreateSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// GET /api/projects
router.get("/projects", async (_req: Request, res: Response) => {
  try {
    const items = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { runs: true, ideas: true, videoFolders: true } },
      },
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Xato" });
  }
});

// POST /api/projects
router.post("/projects", async (req: Request, res: Response) => {
  const parsed = CreateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  try {
    const item = await prisma.project.create({ data: parsed.data });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Xato" });
  }
});

// PATCH /api/projects/:id
router.patch("/projects/:id", async (req: Request, res: Response) => {
  const parsed = UpdateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  try {
    const item = await prisma.project.update({ where: { id: req.params.id }, data: parsed.data });
    res.json(item);
  } catch {
    res.status(404).json({ error: "Loyiha topilmadi" });
  }
});

// DELETE /api/projects/:id
router.delete("/projects/:id", async (req: Request, res: Response) => {
  try {
    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: "Loyiha topilmadi" });
  }
});

export default router;
