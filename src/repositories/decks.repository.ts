import {
  DeckModel,
  type CreateDeckDto,
  type UpdateDeckDto,
} from "../models/deck";
import { Types } from "mongoose";
import { GameCard } from "../models/deck";

export class DecksRepository {
  async create(dto: CreateDeckDto & { cards: GameCard[] }) {
    const deck = new DeckModel(dto);
    const saved = await deck.save();
    return (saved._id as Types.ObjectId).toString();
  }

  async findById(id: string) {
    const deck = await DeckModel.findById(id).lean();
    if (!deck) return null;

    return {
      _id: deck._id.toString(),
      cards: deck.cards as GameCard[],
      pauseCards: deck.pauseCards,
      status: deck.status,
      currentCardIndex: deck.currentCardIndex,
      drawnCards: deck.drawnCards as GameCard[],
      playerName: deck.playerName,
      createdAt: deck.createdAt,
      updatedAt: deck.updatedAt,
    };
  }

  async list({ limit = 50, status }: { limit?: number; status?: string } = {}) {
    const filter = status ? { status } : {};
    const decks = await DeckModel.find(filter).limit(limit).lean();

    return decks.map((deck) => ({
      _id: deck._id.toString(),
      cards: deck.cards as GameCard[],
      pauseCards: deck.pauseCards,
      status: deck.status,
      currentCardIndex: deck.currentCardIndex,
      drawnCards: deck.drawnCards as GameCard[],
      playerName: deck.playerName,
      createdAt: deck.createdAt,
      updatedAt: deck.updatedAt,
    }));
  }

  async update(id: string, dto: UpdateDeckDto) {
    const result = await DeckModel.updateOne({ _id: id }, { $set: dto });
    return result.modifiedCount > 0;
  }

  async delete(id: string) {
    const result = await DeckModel.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  async deleteAll() {
    const result = await DeckModel.deleteMany({});
    return result.deletedCount;
  }

  // Adicionar uma carta ao array drawnCards
  async addDrawnCard(deckId: string, card: GameCard) {
    const result = await DeckModel.updateOne(
      { _id: deckId },
      {
        $push: { drawnCards: card },
        $inc: { currentCardIndex: 1 },
      }
    );
    return result.modifiedCount > 0;
  }
}
