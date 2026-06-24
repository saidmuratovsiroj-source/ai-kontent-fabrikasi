import { Router, Request, Response } from "express";
import multer from "multer";
import { prisma } from "../lib/prisma";
import { createOpenRouterClient } from "../lib/openrouter";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const ext = file.originalname.toLowerCase().split(".").pop() ?? "";
    if (["txt", "md", "pdf", "json"].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Qo'llab-quvvatlanmaydigan format: .${ext}`));
    }
  },
});

async function matnAjrat(file: Express.Multer.File): Promise<string> {
  const ext = file.originalname.toLowerCase().split(".").pop() ?? "";
  if (["txt", "md", "json"].includes(ext)) return file.buffer.toString("utf-8");
  if (ext === "pdf") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
    const res = await pdfParse(file.buffer);
    return res.text;
  }
  throw new Error(`Matn ajratib bo'lmaydigan format: ${ext}`);
}

// POST /api/vebinar/raqib-yuklash
router.post(
  "/vebinar/raqib-yuklash",
  (req: Request, res: Response, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) { res.status(400).json({ error: (err as Error).message }); return; }
      next();
    });
  },
  async (req: Request, res: Response) => {
    if (!req.file) { res.status(400).json({ error: "Fayl yuklanmadi" }); return; }

    const title = (req.body.title as string) || req.file.originalname.replace(/\.[^.]+$/, "");

    try {
      const content = await matnAjrat(req.file);
      const item = await prisma.knowledgeItem.create({
        data: {
          type: "HUJJAT",
          title,
          source: req.file.originalname,
          content,
          summary: content.slice(0, 300),
          visibleTo: ["vebinar-raqib"],
          chunks: Math.ceil(content.length / 500),
          sizeKb: req.file.size / 1024,
        },
      });
      res.json({ id: item.id, title: item.title, sizeKb: Math.round(item.sizeKb * 10) / 10 });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Xato" });
    }
  }
);

// GET /api/vebinar/raqib-fayllar
router.get("/vebinar/raqib-fayllar", async (_req: Request, res: Response) => {
  try {
    const items = await prisma.knowledgeItem.findMany({
      where: { visibleTo: { has: "vebinar-raqib" } },
      select: { id: true, title: true, source: true, sizeKb: true, chunks: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Xato" });
  }
});

// DELETE /api/vebinar/raqib-fayllar/:id
router.delete("/vebinar/raqib-fayllar/:id", async (req: Request, res: Response) => {
  try {
    await prisma.knowledgeItem.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: "Element topilmadi" });
  }
});

interface GenerateBody {
  kursNomi:        string;
  narxi:           string;
  davomiyligi:     string;
  kimlarUchun:     string;
  bonuslar:        string;
  vebinarSana:     string;
  vebinarVaqti:    string;
  telegramLink:    string;
  postTuri:        "progrev" | "daim";
  postSoni:        number;
  qoshimchaBuyruq: string;
}

interface AgentQadam {
  agent:  string;
  model:  string;
  chiqish: string;
}

// Katta fayllar uchun: boshi va oxiridan olish
function aqlliySlice(content: string, limit: number): string {
  if (content.length <= limit) return content;
  const boshi = Math.floor(limit * 0.75);
  const oxiri = limit - boshi;
  return content.slice(0, boshi) + "\n\n[...davomi qisqartirildi...]\n\n" + content.slice(-oxiri);
}

// OpenRouter uchun model ID ni normallashtirish
function normalizaModel(model: string): string {
  if (model.includes("/")) return model;
  if (model.startsWith("claude-")) return `anthropic/${model}`;
  if (model.startsWith("gpt-"))    return `openai/${model}`;
  return model;
}

// [POST_N]...[/POST_N] formatini parse qilish
function parsePostlar(rawText: string): string[] {
  const postlar: string[] = [];
  const regex = /\[POST_(\d+)\]([\s\S]*?)\[\/POST_\1\]/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(rawText)) !== null) {
    const matn = match[2].trim();
    if (matn.length > 20) postlar.push(matn);
  }
  if (postlar.length === 0) {
    rawText.split(/\n\n(?=\[POST_|\d+[\.\)])/g).forEach((b) => {
      const t = b.replace(/\[POST_\d+\]|\[\/POST_\d+\]/g, "").trim();
      if (t.length > 30) postlar.push(t);
    });
  }
  return postlar;
}

// POST /api/vebinar/generate — 4 agentli pipeline
router.post("/vebinar/generate", async (req: Request, res: Response) => {
  const {
    kursNomi, narxi, davomiyligi, kimlarUchun,
    bonuslar, vebinarSana, vebinarVaqti, telegramLink,
    postTuri, postSoni, qoshimchaBuyruq,
  } = req.body as GenerateBody;

  if (!kursNomi?.trim()) {
    res.status(400).json({ error: "Kurs nomi majburiy" });
    return;
  }

  const sonTa = Math.min(Math.max(Number(postSoni) || 7, 1), 21);

  try {
    // Agentlarni DB dan o'qish (model ID larni olish uchun)
    const dbAgentlar = await prisma.agent.findMany({
      where: { isActive: true },
      select: { name: true, model: true },
    });
    const agentModel = (nom: string, fallback: string) =>
      normalizaModel(dbAgentlar.find((a) => a.name === nom)?.model ?? fallback);

    const tadqiqotchiModel = agentModel("Tadqiqotchi", "openai/gpt-4o-mini");
    const ssenaristModel   = agentModel("Ssenarist", "openai/gpt-4o");
    const tanqidchiModel   = agentModel("Tanqidchi",  "anthropic/claude-sonnet-4-6");
    const dizaynerModel    = agentModel("Dizayner",   "openai/gpt-4o-mini");

    // Raqib bazasini o'qish
    const raqibFayllar = await prisma.knowledgeItem.findMany({
      where: { visibleTo: { has: "vebinar-raqib" } },
      select: { title: true, content: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    });
    const HAR_FAYL_LIMIT = 6000;
    const raqibBlok = raqibFayllar
      .map((f, i) =>
        `════ NAMUNA ${i + 1}: "${f.title}" ════\n` + aqlliySlice(f.content, HAR_FAYL_LIMIT)
      )
      .join("\n\n");
    const yuklanganBelgilar = raqibFayllar.reduce(
      (s, f) => s + Math.min(f.content.length, HAR_FAYL_LIMIT), 0
    );

    const kursInfo = [
      `Kurs nomi: ${kursNomi}`,
      narxi        ? `Narxi: ${narxi}` : null,
      davomiyligi  ? `Davomiyligi: ${davomiyligi}` : null,
      kimlarUchun  ? `Kimlar uchun: ${kimlarUchun}` : null,
      bonuslar     ? `Bonuslar: ${bonuslar}` : null,
      vebinarSana  ? `Vebinar sanasi: ${vebinarSana}` : null,
      vebinarVaqti ? `Vebinar vaqti: ${vebinarVaqti}` : null,
      telegramLink ? `Telegram kanal: ${telegramLink}` : null,
    ].filter(Boolean).join("\n");

    const turiTavsif = postTuri === "progrev"
      ? `Vebinargacha ${sonTa} ta isitish (progrev) posti.
Maqsad: qiziqtirish, ishonch qurish, qiymat berish, vebinarga taklif qilish.
Ketma-ketlik: 1-post katta va'da + tanishuv, keyingilar qiymat + real hayot misollari, oxirgisi aniq taklif + vebinarga link.`
      : `Vebinardan keyin ${sonTa} ta follow-up (sotuv) posti.
Maqsad: vebinarda bo'lmaganlarni jalb qilish, e'tirozlarni yechish, ishonch orqali sotuvni yopish.
Ketma-ketlik: 1-post imkoniyat xabari, keyingilar e'tirozlarga javob + real natijalar, oxirgisi ishonch + aniq qaror qabul qilish chaqiruvi.`;

    const openai = createOpenRouterClient();
    const agentQadamlar: AgentQadam[] = [];

    // ── 1-QADAM: TADQIQOTCHI — bazadan ovoz profili ajratish ─────────────────
    const bazaQism = raqibFayllar.length > 0
      ? `RAQIB MATERIALLARI:\n${raqibBlok}`
      : "Raqib materiallari yuklanmagan.";

    const tadqiqotRes = await openai.chat.completions.create({
      model:      tadqiqotchiModel,
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: `Sen — Tadqiqotchi. Quyidagi marketing materiallarini tahlil qil va faqat quyidagilarni ajrat:

1. OVOZ PROFILI: "Siz" yoki "Sen"? Rasmiy yoki do'stona? Qanday his-tuyg'u ustunlik qiladi?
2. HOOK NAQSHLARI: Postlar qanday boshlanadi? (5-7 ta aniq misol: savol, e'tiroz, fakt, his-tuyg'u)
3. CTA USLUBLARI: Harakatga qanday chaqirishadi? (aniq so'z va iboralar)
4. EMOTSIONAL YO'L: Qaysi his-tuyg'u ketma-ketligi ishlaydi? (masalan: muammo→umid→yechim→harakat)
5. GAP TUZILISHI: Qisqa yoki uzun gaplar? Paragraf necha gap?

${bazaQism}

Javob faqat o'zbek tilida (lotin). Har qism ro'yxat sifatida, aniq va qisqa.`,
      }],
    });
    const bazaTahlili = tadqiqotRes.choices[0].message.content ?? "";
    agentQadamlar.push({ agent: "Tadqiqotchi", model: tadqiqotchiModel, chiqish: bazaTahlili });

    // ── 2-QADAM: SSENARIST — bir ovozda postlar yozish ───────────────────────
    const ssenaristSystem = `Sen professional Telegram copywriter bo'lib, O'zbekistonda onlayn kurslar sotish uchun postlar yozasan.

BIRINCHI VA ENG MUHIM QOIDA — TON BIRLIGI:
Barcha ${sonTa} ta post BITTA ODAMNING OVOZI bo'lsin. FAQAT "Siz" ishlatiladi — "Sen" so'zi HECH QACHON YOZILMAYDI.
Bir postda rasmiy, keyingisida norasmiy bo'lishi MAN ETILADI. Xuddi bir kishi bir nafasda hammani yozayotgandek.

METOD — KLONLASH VA MOSLASHTIRISH:
Tadqiqotchi topgan AYNAN SHU hook, ton, CTA, emotsional ketma-ketlikni ishlatasan.
Faqat kurs nomi, narxi, sana o'zgaradi. Uslub, tuzilish, ovoz — namunalarnikidek qoladi.

QOIDALAR:
- Faqat o'zbek tili (lotin alifbosi, kiril yo'q)
- [POST_1]...[/POST_1] format, 1 dan ${sonTa} gacha
- Har post 60-90 so'z — qisqa, lo'nda, O'zbekiston Telegram auditoriyasiga mos. Mazmunni 3 barobar siqib yoz
- EMOJI YO'Q — hech qanday emoji, maxsus belgi
- FAQAT "Siz" (rasmiy murojat) — "Sen" so'zi YO'Q
- "Sun'iy intellekt" (AI emas)
- Har post bitta CTA
- "Oxirgi imkoniyat", "bugun oxirgi kun", "so'nggi joy", "faqat bugun", "vaqt tugayapti" KABI YOLG'ON URGENSIY IBORALARI MUTLAQO MAN ETILGAN`;

    const qoshimchaQism = qoshimchaBuyruq?.trim()
      ? `\nQO'SHIMCHA KO'RSATMA (MAJBURIY):\n${qoshimchaBuyruq.trim()}\n`
      : "";

    const ssenaristUser = `TADQIQOTCHI AJRATGAN NAQSHLAR (SHU ANIQ USLUBNI ISHLAT):
${bazaTahlili}

════════════════════════════
BIZNING KURS:
${kursInfo}

════════════════════════════
TOPSHIRIQ: ${turiTavsif}
${qoshimchaQism}
${sonTa} ta post yoz. [POST_1] boshlang, [/POST_1] tugating.`;

    const ssenaristRes = await openai.chat.completions.create({
      model:      ssenaristModel,
      max_tokens: 9000,
      messages: [
        { role: "system", content: ssenaristSystem },
        { role: "user",   content: ssenaristUser },
      ],
    });
    let rawText = ssenaristRes.choices[0].message.content ?? "";
    agentQadamlar.push({ agent: "Ssenarist", model: ssenaristModel, chiqish: rawText.slice(0, 300) + "..." });

    let postlar = parsePostlar(rawText);

    // ── 3-QADAM: TANQIDCHI — ton birligi tekshiruvi ───────────────────────────
    if (postlar.length > 1) {
      const tanqidRes = await openai.chat.completions.create({
        model:      tanqidchiModel,
        max_tokens: 600,
        messages: [{
          role: "user",
          content: `Sen — Tanqidchi. Quyidagi ${postlar.length} ta Telegram postni uch mezon bo'yicha tekshir.

TEKSHIRISH MEZONLARI:
1. TON BIRLIGI: Barcha postlar bir xil ovozda va emotsional chuqurlikdami? Bitta kishi yozgandek?
2. MUROJAT: Hamma postda faqat "Siz" ishlatilganmi? "Sen" so'zi birorta postda bormi?
3. YOLG'ON URGENSIY: "oxirgi imkoniyat", "bugun oxirgi kun", "so'nggi joy", "faqat bugun", "vaqt tugayapti" iboralari bormi?

POSTLAR:
${postlar.slice(0, 5).map((p, i) => `[${i + 1}]\n${p.slice(0, 200)}...`).join("\n\n")}

FAQAT JSON javob (markdown yo'q):
{"tasdiqlandi": true/false, "muammolar": ["agar bo'lsa muammo"], "xulosa": "1 jumla"}`,
        }],
      });

      let tanqidJSON = { tasdiqlandi: true, muammolar: [] as string[], xulosa: "" };
      try {
        const raw = (tanqidRes.choices[0].message.content ?? "{}").replace(/```\w*\n?|\n?```/g, "").trim();
        const parsed = JSON.parse(raw) as typeof tanqidJSON;
        tanqidJSON = parsed;
      } catch { /* JSON parse xatosi — tasdiqlangan deb hisoblaymiz */ }

      agentQadamlar.push({
        agent:   "Tanqidchi",
        model:   tanqidchiModel,
        chiqish: tanqidJSON.xulosa || (tanqidJSON.tasdiqlandi ? "Tasdiqlandi" : tanqidJSON.muammolar.join("; ")),
      });

      // Rad etilsa — Ssenarist bir marta qayta yozsin
      if (!tanqidJSON.tasdiqlandi && tanqidJSON.muammolar.length > 0) {
        const tuzatishRes = await openai.chat.completions.create({
          model:      ssenaristModel,
          max_tokens: 9000,
          messages: [
            { role: "system",    content: ssenaristSystem },
            { role: "user",      content: ssenaristUser },
            { role: "assistant", content: rawText },
            { role: "user",      content: `Tanqidchi muammolar topdi: ${tanqidJSON.muammolar.join(". ")}\n\nBARCHA POSTLARNI QAYTA YOZ — ton birligi AYNAN bir xil ovoz bo'lsin. Boshidan.` },
          ],
        });
        rawText = tuzatishRes.choices[0].message.content ?? rawText;
        postlar = parsePostlar(rawText);
        agentQadamlar.push({ agent: "Ssenarist (tuzatish)", model: ssenaristModel, chiqish: "Qayta yozildi" });
      }
    }

    // ── 4-QADAM: DIZAYNER — tashqi bilimdan vizual ko'rsatma ─────────────────
    // Dizayner bazadan foydalanmaydi — umumiy bilimidan har post uchun vizual taklif beradi
    const vizualRes = await openai.chat.completions.create({
      model:      dizaynerModel,
      max_tokens: 800,
      messages: [{
        role: "user",
        content: `Sen — Dizayner. Quyidagi ${postlar.length} ta Telegram post uchun qisqa vizual taklif ber.
Har post uchun: qanday rasm/video juftlasa yaxshi (1-2 jumla, aniq, amaliy).
Emoji yo'q. O'zbek tilida.

Kurs: ${kursNomi}
Post turi: ${postTuri === "progrev" ? "Vebinargacha isitish" : "Vebinardan keyin sotuv"}

${postlar.slice(0, Math.min(postlar.length, 5)).map((p, i) => `Post ${i + 1}: ${p.slice(0, 100)}...`).join("\n")}

Format: "Post 1: [taklif]", "Post 2: [taklif]", ...`,
      }],
    });
    const vizualTavsiya = vizualRes.choices[0].message.content ?? "";
    agentQadamlar.push({ agent: "Dizayner", model: dizaynerModel, chiqish: vizualTavsiya });

    res.json({
      postlar,
      postTuri,
      jadval: postlar.map((matn, i) => ({ kun: i + 1, matn })),
      vizualTavsiya,
      agentQadamlar,
      bazaInfo: {
        fayllarSoni:      raqibFayllar.length,
        yuklanganBelgilar,
        faylNomlar:       raqibFayllar.map((f) => f.title),
      },
      tokenlar: {
        kiruv:   (tadqiqotRes.usage?.prompt_tokens ?? 0) + (ssenaristRes.usage?.prompt_tokens ?? 0),
        chiqish: (tadqiqotRes.usage?.completion_tokens ?? 0) + (ssenaristRes.usage?.completion_tokens ?? 0),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "AI xatosi" });
  }
});

export default router;
