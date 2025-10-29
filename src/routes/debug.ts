import { Router } from "express";
import mongoose from "mongoose";
import { CardsRepository } from "../repositories/cards.repository";
import { DecksRepository } from "../repositories/decks.repository";

const r = Router();

r.get("/debug/db", (_req, res) => {
  const c = mongoose.connection;
  res.json({
    readyState: c.readyState,
    db: c.name,
    host: c.host,
  });
});

r.post("/debug/seed", async (_req, res, next) => {
  try {
    const cardsRepo = new CardsRepository();
    const decksRepo = new DecksRepository();

    const ids = await cardsRepo.createMany([
      { number: 1, type: "level", color: "red" },
      { number: 2, type: "level", color: "blue" },
    ]);

    const deckId = await decksRepo.create({
      pauseCards: 1,
      playerName: "Debug Player",
      cards: [
        {
          id: Number(ids[0]),
          number: 1,
          type: "level",
          color: "red",
        },
        {
          id: Number(ids[1]),
          number: 2,
          type: "level",
          color: "blue",
        },
      ],
    });
    res.json({ insertedCards: ids, deckId });
  } catch (e) {
    next(e);
  }
});

export default r;
