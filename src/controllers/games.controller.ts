import type { Request, Response } from "express";
import { GamesService } from "../services/games.service";

const service = new GamesService();

export class GamesController {
  create = async (req: Request, res: Response) => {
    // TODO: parse/validate body with zod (CreateGameDtoSchema)
    // const parse = CreateGameDtoSchema.safeParse(req.body);
    // if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
    // const id = await service.create(parse.data);
    // return res.status(201).json({ id });
    res.status(501).json({ message: "TODO: implement create game" });
  };

  list = async (_req: Request, res: Response) => {
    // TODO: list games with optional filters
    const games = await service.list();
    res.json(games);
  };
}
