import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

// GET /api/runs — barcha pipeline natijalari (runs jadvali)
router.get("/runs", async (_req: Request, res: Response) => {
  try {
    const rows = await prisma.run.findMany({
      select: { id: true, title: true, status: true, input: true, output: true, createdAt: true, budgetLimit: true, budgetSpent: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const result = rows.map((run) => {
      let parsed: Record<string, unknown> | null = null;
      if (run.output) {
        try { parsed = JSON.parse(run.output) as Record<string, unknown>; }
        catch { /* JSON buzilgan bo'lsa o'tkazib yuboramiz */ }
      }
      return {
        id:          run.id,
        title:       run.title,
        status:      run.status,
        input:       run.input,
        createdAt:   run.createdAt,
        budgetLimit: run.budgetLimit,
        budgetSpent: run.budgetSpent,
        approved:    (parsed?.approved  as boolean) ?? false,
        costUsd:     (parsed?.costUsd   as number)  ?? run.budgetSpent ?? 0,
        plan:        (parsed?.plan      as string)  ?? "",
        topic:       (parsed?.topic     as string)  ?? "",
        script:      (parsed?.script    as string)  ?? "",
        thumbnail:   (parsed?.thumbnail as string)  ?? "",
        report:      (parsed?.report    as string)  ?? "",
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Xato" });
  }
});

// GET /api/runs/:id — bitta run to'liq
router.get("/runs/:id", async (req: Request, res: Response) => {
  try {
    const run = await prisma.run.findUnique({ where: { id: req.params.id } });
    if (!run) { res.status(404).json({ error: "Topilmadi" }); return; }

    let parsed: Record<string, unknown> | null = null;
    if (run.output) {
      try { parsed = JSON.parse(run.output) as Record<string, unknown>; }
      catch { /* ignore */ }
    }

    res.json({
      id:        run.id,
      title:     run.title,
      status:    run.status,
      input:     run.input,
      createdAt: run.createdAt,
      approved:  (parsed?.approved  as boolean) ?? false,
      costUsd:   (parsed?.costUsd   as number)  ?? 0,
      plan:      (parsed?.plan      as string)  ?? "",
      topic:     (parsed?.topic     as string)  ?? "",
      script:    (parsed?.script    as string)  ?? "",
      thumbnail: (parsed?.thumbnail as string)  ?? "",
      report:    (parsed?.report    as string)  ?? "",
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Xato" });
  }
});

export default router;
