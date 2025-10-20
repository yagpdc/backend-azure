import type { Request, Response } from "express";
import { getDb } from "../mongo";

export class HealthController {
  // Rota raiz do app
  root = (_req: Request, res: Response) => {
    res.send("Yago santana backend is running!");
  };

  // Health check simples
  health = (_req: Request, res: Response) => {
    res.json({ ok: true });
  };

  // Health check do banco de dados
  healthDb = async (_req: Request, res: Response) => {
    try {
      const db = await getDb();
      await db.command({ ping: 1 });
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e?.message });
    }
  };
}
