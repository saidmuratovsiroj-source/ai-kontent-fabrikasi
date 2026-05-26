import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

// GET /api/video-folders?projectId=...
router.get("/video-folders", async (req: Request, res: Response) => {
  const { projectId } = req.query as { projectId?: string };
  try {
    const items = await prisma.videoFolder.findMany({
      where: projectId ? { projectId } : undefined,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, title: true, topic: true, projectId: true, runId: true, createdAt: true,
        script: false, report: false, thumbnail: false, plan: false,
      },
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Xato" });
  }
});

// GET /api/video-folders/:id
router.get("/video-folders/:id", async (req: Request, res: Response) => {
  try {
    const item = await prisma.videoFolder.findUnique({ where: { id: req.params.id } });
    if (!item) { res.status(404).json({ error: "Papka topilmadi" }); return; }
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Xato" });
  }
});

// DELETE /api/video-folders/:id
router.delete("/video-folders/:id", async (req: Request, res: Response) => {
  try {
    await prisma.videoFolder.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: "Papka topilmadi" });
  }
});

export default router;
