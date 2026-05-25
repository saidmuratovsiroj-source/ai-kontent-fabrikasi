import { Router, Request, Response } from "express";
import { getBudgetStats } from "../services/budget";

const router = Router();

router.get("/budget", async (_req: Request, res: Response) => {
  try {
    const stats = await getBudgetStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Xato" });
  }
});

export default router;
