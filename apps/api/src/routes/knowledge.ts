import { Router, Request, Response } from "express";
import multer from "multer";
import { prisma } from "../lib/prisma";
import { createOpenRouterClient } from "../lib/openrouter";
import { KnowledgeType } from "@prisma/client";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const ext = file.originalname.toLowerCase().split(".").pop() ?? "";
    if (["txt", "md", "pdf", "json", "jpg", "jpeg", "png"].includes(ext)) {
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

async function xulosaYarat(text: string): Promise<string> {
  try {
    const openai   = createOpenRouterClient();
    const preview  = text.slice(0, 3000);
    const response = await openai.chat.completions.create({
      model:      "openai/gpt-4o-mini",
      max_tokens: 200,
      messages: [
        { role: "system", content: "Berilgan matnni 2-3 qisqa jumlada o'zbek tilida xulosalang." },
        { role: "user",   content: preview },
      ],
    });
    return response.choices[0].message.content ?? text.slice(0, 250);
  } catch {
    return text.slice(0, 250);
  }
}

// POST /api/knowledge/upload
router.post(
  "/knowledge/upload",
  (req: Request, res: Response, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) { res.status(400).json({ error: (err as Error).message }); return; }
      next();
    });
  },
  async (req: Request, res: Response) => {
    if (!req.file) { res.status(400).json({ error: "Fayl yuklanmadi" }); return; }

    const ext     = req.file.originalname.toLowerCase().split(".").pop() ?? "";
    const isImage = ["jpg", "jpeg", "png"].includes(ext);

    if (isImage && req.file.size > 10 * 1024 * 1024) {
      res.status(400).json({ error: "Rasm hajmi 10 MB dan oshmasin" });
      return;
    }

    const type: KnowledgeType =
      (req.body.type as KnowledgeType) ?? (isImage ? "RASM" : "HUJJAT");

    const rawVisible = req.body.visibleTo;
    const visibleTo: string[] = rawVisible
      ? Array.isArray(rawVisible) ? rawVisible : [rawVisible]
      : [];

    const title = req.body.title || req.file.originalname.replace(/\.[^.]+$/, "");

    try {
      let content: string;
      let summary: string | null = null;
      let chunks = 0;

      if (isImage) {
        const mime = req.file.mimetype || `image/${ext === "png" ? "png" : "jpeg"}`;
        content = `data:${mime};base64,${req.file.buffer.toString("base64")}`;
        summary = "Rasm fayl";
      } else {
        content = await matnAjrat(req.file);
        chunks  = Math.ceil(content.length / 500);
        summary = await xulosaYarat(content);
      }

      const item = await prisma.knowledgeItem.create({
        data: { type, title, source: req.file.originalname, content, summary, visibleTo, chunks, sizeKb: req.file.size / 1024 },
      });

      res.json({
        id:      item.id,
        type:    item.type,
        title:   item.title,
        summary: item.summary,
        chunks:  item.chunks,
        sizeKb:  Math.round(item.sizeKb * 10) / 10,
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Xato" });
    }
  }
);

// GET /api/knowledge/search?q=...&agent=...
router.get("/knowledge/search", async (req: Request, res: Response) => {
  const { q, agent } = req.query as { q?: string; agent?: string };
  if (!q?.trim()) { res.json([]); return; }

  try {
    const items = await prisma.knowledgeItem.findMany({
      where: {
        type: { not: "RASM" },
        OR: [
          { title:   { contains: q, mode: "insensitive" } },
          { summary: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, type: true, title: true, source: true, summary: true, visibleTo: true, chunks: true, sizeKb: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const natija = agent
      ? items.filter((i) => i.visibleTo.length === 0 || i.visibleTo.includes(agent))
      : items;

    res.json(natija.slice(0, 20));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Xato" });
  }
});

// GET /api/knowledge
router.get("/knowledge", async (_req: Request, res: Response) => {
  try {
    const items = await prisma.knowledgeItem.findMany({
      select: { id: true, type: true, title: true, source: true, summary: true, visibleTo: true, chunks: true, sizeKb: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Xato" });
  }
});

// GET /api/knowledge/:id/image — rasmni qaytarish
router.get("/knowledge/:id/image", async (req: Request, res: Response) => {
  try {
    const item = await prisma.knowledgeItem.findUnique({ where: { id: req.params.id } });
    if (!item || (item.type !== "RASM" && item.type !== "STIL_REFERENS")) {
      res.status(404).json({ error: "Rasm topilmadi" });
      return;
    }
    const match = item.content.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/s);
    if (!match) { res.status(400).json({ error: "Rasm formati noto'g'ri" }); return; }
    const buffer = Buffer.from(match[2], "base64");
    res.setHeader("Content-Type", match[1]);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.end(buffer);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Xato" });
  }
});

// DELETE /api/knowledge/:id
router.delete("/knowledge/:id", async (req: Request, res: Response) => {
  try {
    await prisma.knowledgeItem.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: "Element topilmadi" });
  }
});

export default router;
