import { DecksRepository } from "../repositories/decks.repository";
import type { CreateDeckDto, UpdateDeckDto } from "../models/deck";
import { GAME_CARDS, getCardById } from "../models/game-cards";

export class DecksService {
  private readonly repo = new DecksRepository();

  // Criar um novo deck (embaralhar e selecionar cartas)
  async createDeck(dto: CreateDeckDto) {
    const pauseCards = dto.pauseCards ?? 3;

    // Separar cartas por tipo do array em memória
    const levelCards = GAME_CARDS.filter((c) => c.type === "level");
    const resetCards = GAME_CARDS.filter((c) => c.type === "reset");
    const pauseCardsAll = GAME_CARDS.filter((c) => c.type === "pause");

    // Montar o deck: 40 level + 10 reset + N pause
    const deckCards = [
      ...levelCards, // Todas as 40
      ...resetCards, // Todas as 10
      ...pauseCardsAll.slice(0, pauseCards), // 0-3 pause cards
    ];

    // Embaralhar o deck
    const shuffledDeck = this.shuffleArray(deckCards);

    const deckId = await this.repo.create({
      cards: shuffledDeck, // Salvar objetos GameCard diretamente
      pauseCards,
      playerName: dto.playerName,
    });

    const deck = await this.repo.findById(deckId);

    return {
      message: "Deck criado com sucesso!",
      deck,
      totalCards: shuffledDeck.length,
      breakdown: {
        level: 40,
        reset: 10,
        pause: pauseCards,
      },
    };
  }

  async findById(id: string, includeCardData = false) {
    const deck = await this.repo.findById(id);
    if (!deck) {
      throw new Error("Deck não encontrado");
    }

   
    if (includeCardData) {
      return {
        ...deck,
        cardsData: deck.cards, 
        drawnCardsData: deck.drawnCards, 
      };
    }

    return deck;
  }

  // Listar decks
  async list({ limit = 50, status }: { limit?: number; status?: string } = {}) {
    return this.repo.list({ limit, status });
  }

  // Atualizar deck (status, currentCardIndex, etc)
  async update(id: string, dto: UpdateDeckDto) {
    const updated = await this.repo.update(id, dto);
    if (!updated) {
      throw new Error("Deck não encontrado ou não modificado");
    }
    return { success: true };
  }

  // Deletar deck
  async delete(id: string) {
    const deleted = await this.repo.delete(id);
    if (!deleted) {
      throw new Error("Deck não encontrado");
    }
    return { success: true };
  }

  // Comprar uma carta do deck (draw)
  async drawCard(deckId: string) {
    const deck = await this.repo.findById(deckId);
    if (!deck) {
      throw new Error("Deck não encontrado");
    }

    if (deck.currentCardIndex >= deck.cards.length) {
      throw new Error("Deck vazio! Não há mais cartas para comprar.");
    }

    // Pegar a próxima carta
    const nextCard = deck.cards[deck.currentCardIndex];

    // Adicionar ao drawnCards e incrementar index
    await this.repo.addDrawnCard(deckId, nextCard);

    return {
      card: nextCard, // Já é um objeto GameCard
      remainingCards: deck.cards.length - (deck.currentCardIndex + 1),
    };
  }

  // Limpar todos os decks
  async clearAllDecks() {
    const deletedCount = await this.repo.deleteAll();
    return {
      message: "Todos os decks foram removidos",
      deletedCount,
    };
  }

  // Método auxiliar para embaralhar array (Fisher-Yates)
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}
