import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { KanbanStatus } from "@prisma/client";

const router = Router();

const KanbanStatusSchema = z.nativeEnum(KanbanStatus);

// GET /api/tasks — barcha vazifalar (run va agent ma'lumotlari bilan)
router.get("/tasks", async (_req: Request, res: Response) => {
  try {
    const tasks = await prisma.task.findMany({
      include: {
        run:   { select: { id: true, title: true } },
        agent: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Xato" });
  }
});

// PATCH /api/tasks/:id/status — kanban statusini yangilash
router.patch("/tasks/:id/status", async (req: Request, res: Response) => {
  const { id } = req.params;
  const parsed = KanbanStatusSchema.safeParse(req.body.kanbanStatus);
  if (!parsed.success) {
    res.status(400).json({ error: "Noto'g'ri status qiymati" });
    return;
  }
  try {
    const task = await prisma.task.update({
      where: { id },
      data:  { kanbanStatus: parsed.data },
    });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Xato" });
  }
});

export default router;
