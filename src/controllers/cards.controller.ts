import type { Request, Response } from "express";
import { CardsService } from "../services/cards.service";
import { CreateCardDtoSchema, UpdateCardDtoSchema } from "../models/card";

const service = new CardsService();

export class CardsController {
  // POST /cards - Criar um card
  create = async (req: Request, res: Response) => {
    const parse = CreateCardDtoSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    try {
      const id = await service.create(parse.data);
      res.status(201).json({ id });
    } catch (error: any) {
      res.status(500).json({ error: error?.message ?? "Erro ao criar card" });
    }
  };

  // GET /cards/:id - Buscar card por ID
  findById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const card = await service.findById(id);
      res.json(card);
    } catch (error: any) {
      res.status(404).json({ error: error?.message ?? "Card não encontrado" });
    }
  };

  // GET /cards - Listar todos os cards
  list = async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const cards = await service.list({ limit });
      res.json(cards);
    } catch (error: any) {
      res.status(500).json({ error: error?.message ?? "Erro ao listar cards" });
    }
  };

  // PUT /cards/:id - Atualizar card
  update = async (req: Request, res: Response) => {
    const parse = UpdateCardDtoSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    try {
      const { id } = req.params;
      const result = await service.update(id, parse.data);
      res.json(result);
    } catch (error: any) {
      res
        .status(404)
        .json({ error: error?.message ?? "Erro ao atualizar card" });
    }
  };

  // DELETE /cards/:id - Deletar card
  delete = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await service.delete(id);
      res.json(result);
    } catch (error: any) {
      res.status(404).json({ error: error?.message ?? "Erro ao deletar card" });
    }
  };

  // POST /cards/game/start - Criar deck do jogo
  // Body opcional: { "pauseCards": 0-3 } (padrão: 3)
  startGame = async (req: Request, res: Response) => {
    try {
      const pauseCards =
        req.body?.pauseCards !== undefined ? Number(req.body.pauseCards) : 3;

      if (isNaN(pauseCards) || pauseCards < 0 || pauseCards > 3) {
        return res.status(400).json({
          error: "pauseCards deve ser um número entre 0 e 3",
        });
      }

      const result = await service.createGameDeck(pauseCards);
      res.status(201).json(result);
    } catch (error: any) {
      res
        .status(500)
        .json({ error: error?.message ?? "Erro ao criar deck do jogo" });
    }
  };

  // DELETE /cards/game/clear - Limpar todas as cartas
  clearGame = async (_req: Request, res: Response) => {
    try {
      const result = await service.clearAllCards();
      res.json(result);
    } catch (error: any) {
      res
        .status(500)
        .json({ error: error?.message ?? "Erro ao limpar cartas" });
    }
  };
}
