import { CardsRepository } from "../repositories/cards.repository";
import type { CreateCardDto } from "../models/card";
import { CardTypes, CardColors } from "../models/card";

export class CardsService {
  private readonly repo = new CardsRepository();

  // Buscar card por ID
  async findById(id: string) {
    const card = await this.repo.findById(id);
    if (!card) {
      throw new Error("Card não encontrado");
    }
    return card;
  }

  // Listar cards
  async list({ limit = 100 }: { limit?: number } = {}) {
    return this.repo.list({ limit });
  }

  // Inicializar as 53 cartas fixas no banco (deve ser chamado apenas uma vez)
  async initializeCards() {
    // Verificar se já existem cartas
    const existingCards = await this.repo.list({ limit: 1 });
    if (existingCards.length > 0) {
      return {
        message: "Cards já foram inicializados",
        totalCards: (await this.repo.list({ limit: 100 })).length,
      };
    }

    const cards: CreateCardDto[] = [];
    const colors = Object.values(CardColors);

    // 1. Cartas de nível (40 cartas: 8 números × 5 cores = 40)
    for (let number = 1; number <= 8; number++) {
      for (const color of colors) {
        cards.push({ number, type: CardTypes.LEVEL as any, color });
      }
    }

    // 2. Cartas de reset (10 cartas: 2 de cada cor)
    for (const color of colors) {
      for (let i = 0; i < 2; i++) {
        cards.push({ number: 0, type: CardTypes.RESET as any, color });
      }
    }

    // 3. Cartas de pausa (3 cartas - máximo possível)
    for (let i = 0; i < 3; i++) {
      cards.push({ number: 0, type: CardTypes.PAUSE as any });
    }

    // Salvar todas as cartas
    const ids = await this.repo.createMany(cards);

    return {
      message: "Cards inicializados com sucesso!",
      totalCards: ids.length,
      breakdown: {
        level: 40,
        reset: 10,
        pause: 3,
      },
    };
  }

  // Obter todas as cartas (para criar decks)
  async getAllCards() {
    return this.repo.list({ limit: 100 });
  }

  // Limpar todas as cartas (cuidado! só usar em dev/reset)
  async clearAllCards() {
    const deletedCount = await this.repo.deleteAll();
    return {
      message: "Todas as cartas foram removidas",
      deletedCount,
    };
  }
}
