import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { youtubeKanalVideolari, extractYoutubeChannelId } from "../services/youtube";
import { runResearchAgent } from "../agents/researchAgent";

const router = Router();

// GET /api/analytics/summary
router.get("/analytics/summary", async (_req: Request, res: Response) => {
  try {
    const kanallar = await prisma.channel.findMany();
    const menKanallar  = kanallar.filter((k) => k.who === "MEN");
    const raqibKanallar = kanallar.filter((k) => k.who === "RAQIB");
    const umumiyKorishlar = menKanallar.reduce((s, k) => s + k.views, 0);

    // Viral: oxirgi 30 kunda raqiblardan sinxronlangan, ko'rishlar so'nggi sinxrondan yuqori
    const viralCount = 0; // /api/viral orqali dinamik hisoblanadi

    res.json({
      menCount:         menKanallar.length,
      raqibCount:       raqibKanallar.length,
      viralCount,
      umumiyKorishlar,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Xato" });
  }
});

// GET /api/analytics/chart?period=30
router.get("/analytics/chart", async (req: Request, res: Response) => {
  const period = Math.max(7, Math.min(365, parseInt(req.query.period as string) || 30));
  const after  = new Date(Date.now() - period * 86_400_000);

  try {
    const snapshots = await prisma.channelSnapshot.findMany({
      where:   { createdAt: { gte: after } },
      include: { channel: { select: { channelName: true, who: true } } },
      orderBy: { createdAt: "asc" },
    });

    // Kanal bo'yicha guruhlash
    const byChannel: Record<string, {
      channelName: string;
      who:         string;
      data:        { date: string; subscribers: number }[];
    }> = {};

    for (const snap of snapshots) {
      if (!byChannel[snap.channelId]) {
        byChannel[snap.channelId] = { channelName: snap.channel.channelName, who: snap.channel.who, data: [] };
      }
      byChannel[snap.channelId].data.push({
        date:        snap.createdAt.toISOString().slice(0, 10),
        subscribers: snap.subscribers,
      });
    }

    // Snapshot yo'q bo'lsa, hozirgi qiymatni ko'rsatish
    if (snapshots.length === 0) {
      const channels = await prisma.channel.findMany();
      const today = new Date().toISOString().slice(0, 10);
      for (const ch of channels) {
        byChannel[ch.id] = { channelName: ch.channelName, who: ch.who, data: [{ date: today, subscribers: ch.subscribers }] };
      }
    }

    res.json(Object.entries(byChannel).map(([channelId, val]) => ({ channelId, ...val })));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Xato" });
  }
});

// GET /api/analytics/heatmap?channelId=xxx
router.get("/analytics/heatmap", async (req: Request, res: Response) => {
  const { channelId } = req.query as { channelId?: string };

  try {
    const where = channelId
      ? { id: channelId, who: "RAQIB" as const, platform: "YOUTUBE" as const }
      : { who: "RAQIB" as const, platform: "YOUTUBE" as const };

    const kanallar = await prisma.channel.findMany({ where });
    if (!kanallar.length) {
      res.json({ matrix: Array.from({ length: 7 }, () => Array(24).fill(0)), maxDay: 0, maxHour: 0 });
      return;
    }

    const after = new Date(Date.now() - 90 * 86_400_000);
    const matrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));

    for (const kanal of kanallar) {
      const ytId = extractYoutubeChannelId(kanal.channelUrl);
      if (!ytId) continue;
      try {
        const videolar = await youtubeKanalVideolari(ytId, after, 50);
        for (const v of videolar) {
          const d = new Date(v.publishedAt);
          const day  = (d.getDay() + 6) % 7; // Du=0, Ya=6
          const hour = d.getHours();
          matrix[day][hour] += v.viewCount;
        }
      } catch { /* API kalit yo'q yoki limit */ }
    }

    // Eng faol vaqtni topish
    let maxVal = 0, maxDay = 0, maxHour = 0;
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        if (matrix[d][h] > maxVal) { maxVal = matrix[d][h]; maxDay = d; maxHour = h; }
      }
    }

    res.json({ matrix, maxDay, maxHour });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Xato" });
  }
});

// POST /api/analytics/svodka
router.post("/analytics/svodka", async (_req: Request, res: Response) => {
  try {
    const raqiblar = await prisma.channel.findMany({ where: { who: "RAQIB" } });
    if (!raqiblar.length) {
      res.status(400).json({ error: "Raqib kanallar yo'q. Avval Kanallar sahifasida raqib qo'shing." });
      return;
    }

    const topic = [
      "Quyidagi YouTube raqiblarning tahlilini qil:",
      ...raqiblar.map((r) => `- ${r.channelName}: ${r.subscribers.toLocaleString()} obunachi, ${r.videosCount} video, ${r.views.toLocaleString()} umumiy ko'rish`),
      "",
      "1) Ularning eng kuchli tomonlari nimada?",
      "2) Qanday kontent trendlari ko'rinmoqda?",
      "3) Biz uchun qanday strategiya tavsiya qilasiz?",
    ].join("\n");

    const natija = await runResearchAgent(topic);
    res.json({ report: natija.report, queries: natija.queries });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Xato" });
  }
});

export default router;
