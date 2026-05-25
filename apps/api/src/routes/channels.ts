import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { Platform, Who } from "@prisma/client";
import { youtubeKanalMalumatOl } from "../services/youtube";

const router = Router();

const YangiKanalSchema = z.object({
  platform:    z.nativeEnum(Platform),
  who:         z.nativeEnum(Who),
  channelUrl:  z.string().min(1),
  channelName: z.string().optional(),
  subscribers: z.number().int().min(0).optional(),
  views:       z.number().min(0).optional(),
  videosCount: z.number().int().min(0).optional(),
});

// GET /api/channels
router.get("/channels", async (_req: Request, res: Response) => {
  try {
    const kanallar = await prisma.channel.findMany({ orderBy: { createdAt: "desc" } });
    res.json(kanallar);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Xato" });
  }
});

// POST /api/channels — YouTube bo'lsa API dan avtomatik ma'lumot oladi
router.post("/channels", async (req: Request, res: Response) => {
  const parsed = YangiKanalSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { platform, who, channelUrl } = parsed.data;
  let { channelName, subscribers, views, videosCount } = parsed.data;

  if (platform === "YOUTUBE") {
    try {
      const info = await youtubeKanalMalumatOl(channelUrl);
      channelName  = info.channelName;
      subscribers  = info.subscribers;
      views        = info.views;
      videosCount  = info.videosCount;
    } catch (err) {
      // API kalit yo'q yoki kanal topilmadi — qo'lda kiritilgan ma'lumot bilan davom etamiz
      const msg = err instanceof Error ? err.message : "YouTube API xatosi";
      if (!channelName) {
        res.status(422).json({ error: msg });
        return;
      }
    }
  }

  try {
    const kanal = await prisma.channel.create({
      data: {
        platform,
        who,
        channelUrl,
        channelName:  channelName  ?? channelUrl,
        subscribers:  subscribers  ?? 0,
        views:        views        ?? 0,
        videosCount:  videosCount  ?? 0,
        lastSync:     platform === "YOUTUBE" ? new Date() : null,
      },
    });
    res.status(201).json(kanal);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Xato" });
  }
});

// POST /api/channels/:id/sync — YouTube statistikasini yangilash
router.post("/channels/:id/sync", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const kanal = await prisma.channel.findUnique({ where: { id } });
    if (!kanal) { res.status(404).json({ error: "Kanal topilmadi" }); return; }
    if (kanal.platform !== "YOUTUBE") {
      res.status(400).json({ error: "Faqat YouTube kanallari sinxronlanadi" });
      return;
    }

    const info = await youtubeKanalMalumatOl(kanal.channelUrl);
    const yangilangan = await prisma.channel.update({
      where: { id },
      data: {
        channelName: info.channelName,
        subscribers: info.subscribers,
        views:       info.views,
        videosCount: info.videosCount,
        lastSync:    new Date(),
      },
    });
    res.json(yangilangan);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Xato" });
  }
});

// DELETE /api/channels/:id
router.delete("/channels/:id", async (req: Request, res: Response) => {
  try {
    await prisma.channel.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Xato" });
  }
});

export default router;
