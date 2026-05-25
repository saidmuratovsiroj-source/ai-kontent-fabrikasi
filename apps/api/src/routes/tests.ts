import { Router, Request, Response } from "express";
import { z } from "zod";
import { TEST_HOLATLARI, tekshir } from "../services/testCases";

const router = Router();

// GET /api/tests — barcha test holatlari
router.get("/tests", (_req: Request, res: Response) => {
  res.json(TEST_HOLATLARI.map(({ id, raqam, mavzu, tavsif, mezonlar }) => ({
    id, raqam, mavzu, tavsif, mezonlar,
  })));
});

// POST /api/test/validate — natijani tekshirish
const ValidateSchema = z.object({
  testId:    z.string(),
  script:    z.string(),
  thumbnail: z.string(),
});

router.post("/test/validate", (req: Request, res: Response) => {
  const parsed = ValidateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { testId, script, thumbnail } = parsed.data;
  const test = TEST_HOLATLARI.find((t) => t.id === testId);
  if (!test) {
    res.status(404).json({ error: `Test topilmadi: ${testId}` });
    return;
  }

  const natija = tekshir(test, script, thumbnail);
  res.json(natija);
});

export default router;
