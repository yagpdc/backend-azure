import type { Request, Response } from "express";
import { GAME_CARDS, getCardById } from "../models/game-cards";

export class CardsController {
  list = async (_req: Request, res: Response) => {
    try {
      res.json({
        message: "53 cartas fixas do jogo",
        totalCards: GAME_CARDS.length,
        breakdown: { level: 40, reset: 10, pause: 3 },
        cards: GAME_CARDS,
      });
    } catch (error: any) {
      res.status(500).json({ error: error?.message ?? "Erro ao listar cards" });
    }
  };

  findById = async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id) || id < 0 || id > 52) {
        return res
          .status(400)
          .json({ error: "ID deve ser um número entre 0 e 52" });
      }
      const card = getCardById(id);
      if (!card) {
        return res.status(404).json({ error: "Card não encontrado" });
      }
      res.json(card);
    } catch (error: any) {
      res.status(404).json({ error: error?.message ?? "Card não encontrado" });
    }
  };
}
