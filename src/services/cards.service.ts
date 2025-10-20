import { CardsRepository } from "../repositories/cards.repository";
import type { CreateCardDto, UpdateCardDto } from "../models/card";
import { CardTypes } from "../models/card";

export class CardsService {
  private readonly repo = new CardsRepository();

  // Criar um card
  async create(dto: CreateCardDto) {
    return this.repo.create(dto);
  }

  // Buscar card por ID
  async findById(id: string) {
    const card = await this.repo.findById(id);
    if (!card) {
      throw new Error("Card não encontrado");
    }
    return card;
  }

  // Listar cards
  async list({ limit = 50 }: { limit?: number } = {}) {
    return this.repo.list({ limit });
  }

  // Atualizar card
  async update(id: string, dto: UpdateCardDto) {
    const updated = await this.repo.update(id, dto);
    if (!updated) {
      throw new Error("Card não encontrado ou não modificado");
    }
    return { success: true };
  }

  // Deletar card
  async delete(id: string) {
    const deleted = await this.repo.delete(id);
    if (!deleted) {
      throw new Error("Card não encontrado");
    }
    return { success: true };
  }

  // Criar deck do jogo (total varia conforme pauseCards)
  async createGameDeck(pauseCards: number = 3) {
    const deck: CreateCardDto[] = [];
    const colors: ("purple" | "red" | "blue" | "yellow" | "green")[] = [
      "purple",
      "red",
      "blue",
      "yellow",
      "green",
    ];

    // 1. Cartas de nível (40 cartas: 8 números × 5 cores = 40) - FIXO
    // Cada número (1-8) aparece uma vez em cada cor
    for (let numero = 1; numero <= 8; numero++) {
      for (const color of colors) {
        deck.push({ numero, tipo: CardTypes.LEVEL, color });
      }
    }

    // 2. Cartas de reset (10 cartas: 2 de cada cor) - FIXO
    for (const color of colors) {
      for (let i = 0; i < 2; i++) {
        deck.push({ numero: 0, tipo: CardTypes.RESET, color });
      }
    }

    // 3. Cartas de pausa (quantidade variável: 0 a 3) - VARIÁVEL
    for (let i = 0; i < pauseCards; i++) {
      deck.push({ numero: 0, tipo: CardTypes.PAUSE });
    }

    // Embaralhar o deck
    const shuffledDeck = this.shuffleDeck(deck);

    // Salvar no banco e buscar as cartas completas
    const ids = await this.repo.createDeck(shuffledDeck);

    // Buscar todas as cartas criadas com seus dados completos
    const cards = await Promise.all(ids.map((id) => this.repo.findById(id)));

    return {
      message: "Deck do jogo criado com sucesso!",
      totalCards: cards.length,
      breakdown: {
        level: 40,
        reset: 10,
        pause: pauseCards,
      },
      cards: cards.filter((card) => card !== null),
    };
  }

  // Método auxiliar para embaralhar o deck (algoritmo Fisher-Yates)
  private shuffleDeck(deck: CreateCardDto[]): CreateCardDto[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Limpar todas as cartas do banco (útil para resetar o jogo)
  async clearAllCards() {
    const cards = await this.repo.list({ limit: 1000 });
    let deletedCount = 0;

    for (const card of cards) {
      if (card._id) {
        await this.repo.delete(card._id);
        deletedCount++;
      }
    }

    return {
      message: "Todas as cartas foram removidas",
      deletedCount,
    };
  }
}
