import type { Request, Response } from "express";
import { DecksService } from "../services/decks.service";
import { CreateDeckDtoSchema, UpdateDeckDtoSchema } from "../models/deck";

export class DecksController {
  private service = new DecksService();

  // POST /decks - Criar novo deck
  create = async (req: Request, res: Response) => {
    try {
      const validation = CreateDeckDtoSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.issues });
      }

      const result = await this.service.createDeck(validation.data);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  // GET /decks/:id - Buscar deck por ID
  findById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const includeCardData = req.query.includeCards === "true";

      const deck = await this.service.findById(id, includeCardData);
      res.json(deck);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  };

  // GET /decks - Listar decks
  list = async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const status = req.query.status as string | undefined;

      const decks = await this.service.list({ limit, status });
      res.json(decks);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  // PUT /decks/:id - Atualizar deck
  update = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const validation = UpdateDeckDtoSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({ error: validation.error.issues });
      }

      const result = await this.service.update(id, validation.data);
      res.json(result);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  };

  // DELETE /decks/:id - Deletar deck
  delete = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await this.service.delete(id);
      res.json(result);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  };

  // POST /decks/:id/draw - Comprar uma carta
  drawCard = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await this.service.drawCard(id);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  // DELETE /decks/clear - Limpar todos os decks
  clearAll = async (_req: Request, res: Response) => {
    try {
      const result = await this.service.clearAllDecks();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}
