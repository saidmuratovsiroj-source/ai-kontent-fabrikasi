import { Router, Request, Response } from "express";
import multer from "multer";
import { prisma } from "../lib/prisma";

const router  = Router();
const upload  = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// Matnni 500 belgilik bo'laklarga ajratadi
function chunkText(text: string, size = 500): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    const chunk = text.slice(i, i + size).trim();
    if (chunk) chunks.push(chunk);
  }
  return chunks;
}

// Fayldan matn ajratib olish
async function extractText(file: Express.Multer.File): Promise<string> {
  if (file.mimetype === "text/plain") {
    return file.buffer.toString("utf-8");
  }

  if (file.mimetype === "application/pdf") {
    // pdf-parse ni dinamik import qilamiz (CommonJS module)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
    const result   = await pdfParse(file.buffer);
    return result.text;
  }

  throw new Error(`Qo'llab-quvvatlanmaydigan format: ${file.mimetype}`);
}

// POST /api/knowledge/upload
router.post(
  "/knowledge/upload",
  upload.single("file"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: "Fayl yuklanmadi" });
      return;
    }

    try {
      const text   = await extractText(req.file);
      const chunks = chunkText(text);

      const item = await prisma.knowledgeItem.create({
        data: {
          title:   req.body.title ?? req.file.originalname,
          source:  req.file.originalname,
          content: text,
          chunks:  chunks.length,
          sizeKb:  req.file.size / 1024,
        },
      });

      res.json({
        id:     item.id,
        title:  item.title,
        chunks: item.chunks,
        sizeKb: Math.round(item.sizeKb * 10) / 10,
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Xato" });
    }
  }
);

// GET /api/knowledge
router.get("/knowledge", async (_req: Request, res: Response) => {
  const items = await prisma.knowledgeItem.findMany({
    select: { id: true, title: true, source: true, chunks: true, sizeKb: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(items);
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
