import { getDb } from "../mongo";
import type { CreateCardDto, UpdateCardDto } from "../models/card";
import { ObjectId } from "mongodb";

export class CardsRepository {
  private collectionName = "cards" as const;

  private async collection() {
    const db = await getDb();
    return db.collection(this.collectionName);
  }

  async create(dto: CreateCardDto) {
    const col = await this.collection();
    const doc = {
      ...dto,
      createdAt: new Date(),
    };
    const result = await col.insertOne(doc);
    return result.insertedId.toString();
  }

  async findById(id: string) {
    const col = await this.collection();
    const card = await col.findOne({ _id: new ObjectId(id) });
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
    const col = await this.collection();
    const cards = await col.find().limit(limit).toArray();

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
    const col = await this.collection();
    const result = await col.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...dto,
          updatedAt: new Date(),
        },
      }
    );
    return result.modifiedCount > 0;
  }

  async delete(id: string) {
    const col = await this.collection();
    const result = await col.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  async createDeck(cards: CreateCardDto[]) {
    const col = await this.collection();
    const docs = cards.map((card) => ({
      ...card,
      createdAt: new Date(),
    }));

    const result = await col.insertMany(docs);

    const ids = Object.values(result.insertedIds);
    const firstSaved = await col.findOne({ _id: ids[0] });

    return ids.map((id) => id.toString());
  }
}
