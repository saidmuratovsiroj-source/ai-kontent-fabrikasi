import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { youtubeKanalVideolari, extractYoutubeChannelId, YouTubeVideoInfo } from "../services/youtube";

const router = Router();

// GET /api/viral?channelId=xxx&period=30
router.get("/viral", async (req: Request, res: Response) => {
  const { channelId } = req.query as { channelId?: string };
  const period = Math.max(1, Math.min(90, parseInt(req.query.period as string) || 30));
  const after  = new Date(Date.now() - period * 86_400_000);

  try {
    const where = channelId
      ? { id: channelId, who: "RAQIB" as const, platform: "YOUTUBE" as const }
      : { who: "RAQIB" as const, platform: "YOUTUBE" as const };

    const kanallar = await prisma.channel.findMany({ where });

    const barcha: (YouTubeVideoInfo & { kanalNomi: string })[] = [];

    for (const kanal of kanallar) {
      const ytId = extractYoutubeChannelId(kanal.channelUrl);
      if (!ytId) continue;
      try {
        const videolar = await youtubeKanalVideolari(ytId, after, 10);
        barcha.push(...videolar.map((v) => ({ ...v, kanalNomi: kanal.channelName })));
      } catch { /* API kalit yo'q */ }
    }

    barcha.sort((a, b) => b.viewCount - a.viewCount);
    res.json(barcha.slice(0, 30));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Xato" });
  }
});

export default router;
