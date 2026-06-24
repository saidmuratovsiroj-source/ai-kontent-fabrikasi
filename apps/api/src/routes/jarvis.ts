import { Router, Request, Response } from "express";
import { createOpenRouterClient } from "../lib/openrouter";

const router = Router();

const JARVIS_MODEL = "anthropic/claude-sonnet-4-6";

const TIZIM_PROMPTI = `Sen Jarvis — Siroj ning shaxsiy AI assistantsan.

KIMSAN:
- Iron Man filmidagi Jarvis singari aqlli, tez va ishonchli assistant
- Sening egang Siroj — professional marketolog (Instagram: @siroj.marketolog)
- O'zbek tilida (lotin alifbosida) gaplashasan
- Qisqa, aniq va foydali javoblar berasan

EGANG HAQIDA:
- Siroj — marketolog, SMM va target reklama bilan shug'ullanadi
- Telegram kanali va Instagram sahifasi bor
- Mijozlari uchun kontent va reklama tayyorlaydi

BILIM SOHALARING:
- Marketing, SMM, kontent strategiya, target reklama
- Rejalashtirish va biznes maslahatlar

GAPLASHISH USLUBI:
- "Ha, Siroj" yoki "Albatta" deb boshla
- Do'stona lekin professional
- Aniq va lo'nda gapir`;

const POST_PROMPTI = `Sen professional SMM kontent yozuvchisan.
Siroj (marketolog, @siroj.marketolog) ning Telegram kanali uchun post yozasan.

QOIDALAR:
- O'zbek tilida (lotin alifbosi)
- Qiziqarli hook bilan boshla
- Qisqa paragraflar, o'qish oson
- 2-4 ta mos emoji ishlatish mumkin
- Oxirida aniq CTA
- Post uzunligi: 400-800 belgi
- Faqat POST MATNINI yoz, boshqa hech narsa qo'shma`;

const GOYA_PROMPTI = `Sen kreativ SMM strategsan.
Marketolog uchun kontent g'oyalari berasan.

QOIDALAR:
- O'zbek tilida
- 5 ta aniq, amaliy g'oya ber
- Har biriga 1 qator format tavsiyasi (Reels/Carousel/Post/Stories)
- Raqamlangan ro'yxat shaklida`;

interface ChatXabar {
  role: "user" | "assistant";
  content: string;
}

// POST /api/jarvis/chat
router.post("/jarvis/chat", async (req: Request, res: Response) => {
  const { xabar, tarix } = req.body as { xabar: string; tarix: ChatXabar[] };
  if (!xabar?.trim()) {
    res.status(400).json({ error: "Xabar bo'sh" });
    return;
  }

  const openai = createOpenRouterClient();
  const xabarlar: ChatXabar[] = [...(tarix ?? []), { role: "user", content: xabar }];

  try {
    const natija = await openai.chat.completions.create({
      model:      JARVIS_MODEL,
      max_tokens: 1000,
      messages:   [{ role: "system", content: TIZIM_PROMPTI }, ...xabarlar],
    });
    res.json({ javob: natija.choices[0].message.content ?? "" });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "AI xatosi" });
  }
});

// POST /api/jarvis/post
router.post("/jarvis/post", async (req: Request, res: Response) => {
  const { mavzu } = req.body as { mavzu: string };
  if (!mavzu?.trim()) {
    res.status(400).json({ error: "Mavzu bo'sh" });
    return;
  }

  const openai = createOpenRouterClient();
  try {
    const natija = await openai.chat.completions.create({
      model:      JARVIS_MODEL,
      max_tokens: 1200,
      messages: [
        { role: "system", content: POST_PROMPTI },
        { role: "user",   content: `Mavzu: ${mavzu}` },
      ],
    });
    res.json({ post: natija.choices[0].message.content ?? "" });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "AI xatosi" });
  }
});

// POST /api/jarvis/goyalar
router.post("/jarvis/goyalar", async (req: Request, res: Response) => {
  const { mavzu } = req.body as { mavzu: string };
  if (!mavzu?.trim()) {
    res.status(400).json({ error: "Mavzu bo'sh" });
    return;
  }

  const openai = createOpenRouterClient();
  try {
    const natija = await openai.chat.completions.create({
      model:      JARVIS_MODEL,
      max_tokens: 1200,
      messages: [
        { role: "system", content: GOYA_PROMPTI },
        { role: "user",   content: `Mavzu/nisha: ${mavzu}` },
      ],
    });
    res.json({ goyalar: natija.choices[0].message.content ?? "" });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "AI xatosi" });
  }
});

export default router;
