import type { Request, Response } from "express";
import mongoose from "mongoose";

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
      // Verifica se está conectado ao MongoDB via Mongoose
      if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({
          ok: false,
          error: "Database not connected",
          state: mongoose.connection.readyState,
        });
      }

      // Faz ping no banco
      await mongoose.connection.db?.admin().ping();
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e?.message });
    }
  };
}
