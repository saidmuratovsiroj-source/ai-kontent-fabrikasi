import { Router, Request, Response } from "express";
import { pool } from "../db/db";

const router = Router();

router.get("/health", async (_req: Request, res: Response) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      database: "ulanish mavjud",
    });
  } catch {
    res.status(503).json({
      status: "error",
      timestamp: new Date().toISOString(),
      database: "ulanish yo'q",
    });
  }
});

export default router;
