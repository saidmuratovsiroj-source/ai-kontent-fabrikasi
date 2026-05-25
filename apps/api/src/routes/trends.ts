import { Router, Request, Response } from "express";
import { youtubeTrendlar, YouTubeVideoInfo } from "../services/youtube";

const router = Router();

const TRENDLI_MAVZULAR = [
  "AI sun'iy intellekt",
  "machine learning o'zbek",
  "ChatGPT tutorial",
  "texnologiya yangiliklari",
  "dasturlash Python",
];

// GET /api/trends?days=7
router.get("/trends", async (req: Request, res: Response) => {
  const days = Math.max(1, Math.min(30, parseInt(req.query.days as string) || 7));
  const after = new Date(Date.now() - days * 86_400_000);

  try {
    const barcha: YouTubeVideoInfo[] = [];

    for (const qidiruv of TRENDLI_MAVZULAR) {
      try {
        const videolar = await youtubeTrendlar(qidiruv, after, 5);
        barcha.push(...videolar);
      } catch { /* API kalit yo'q */ }
    }

    // Ko'rishlar bo'yicha tartiblash va takrorlanmaslik
    const noyob = Array.from(new Map(barcha.map((v) => [v.videoId, v])).values());
    noyob.sort((a, b) => b.viewCount - a.viewCount);

    res.json(noyob.slice(0, 20));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Xato" });
  }
});

export default router;
