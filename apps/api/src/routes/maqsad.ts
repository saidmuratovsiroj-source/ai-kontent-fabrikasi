import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const router = Router();

const MaqsadSchema = z.object({
  targetSubscribers: z.number().int().min(1),
  targetDate:        z.string().datetime(),
  mainChannelId:     z.string().uuid().nullable().optional(),
});

// GET /api/maqsad — joriy maqsad + asosiy kanal obunachilar soni
router.get("/maqsad", async (_req: Request, res: Response) => {
  try {
    const maqsad = await prisma.maqsad.findFirst({
      include: { mainChannel: { select: { id: true, channelName: true, subscribers: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(maqsad ?? null);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Xato" });
  }
});

// PUT /api/maqsad — maqsad yangilash (yoki yaratish)
router.put("/maqsad", async (req: Request, res: Response) => {
  const parsed = MaqsadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  try {
    const mavjud = await prisma.maqsad.findFirst({ orderBy: { createdAt: "desc" } });
    const data = {
      targetSubscribers: parsed.data.targetSubscribers,
      targetDate:        new Date(parsed.data.targetDate),
      mainChannelId:     parsed.data.mainChannelId ?? null,
    };

    const maqsad = mavjud
      ? await prisma.maqsad.update({ where: { id: mavjud.id }, data })
      : await prisma.maqsad.create({ data });

    res.json(maqsad);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Xato" });
  }
});

export default router;
