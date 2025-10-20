import {
  CardModel,
  type CreateCardDto,
  type UpdateCardDto,
  type ICard,
} from "../models/card";
import { Types } from "mongoose";

export class CardsRepository {
  async create(dto: CreateCardDto) {
    const card = new CardModel(dto);
    const saved = await card.save();
    return (saved._id as Types.ObjectId).toString();
  }

  async findById(id: string) {
    const card = await CardModel.findById(id).lean();
    if (!card) return null;

    return {
      _id: card._id.toString(),
      numero: card.numero,
      tipo: card.tipo,
      color: card.color,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
    };
  }

  async list({ limit = 50 }: { limit?: number } = {}) {
    const cards = await CardModel.find().limit(limit).lean();

    return cards.map((card) => ({
      _id: card._id.toString(),
      numero: card.numero,
      tipo: card.tipo,
      color: card.color,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
    }));
  }

  async update(id: string, dto: UpdateCardDto) {
    const result = await CardModel.updateOne({ _id: id }, { $set: dto });
    return result.modifiedCount > 0;
  }

  async delete(id: string) {
    const result = await CardModel.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  async deleteAll() {
    const result = await CardModel.deleteMany({});
    return result.deletedCount;
  }

  async createDeck(cards: CreateCardDto[]) {
    const result = await CardModel.insertMany(cards);
    return result.map((card) => (card._id as Types.ObjectId).toString());
  }
}
