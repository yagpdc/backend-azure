import { CardTypes, CardColors } from "./card";

// Tipo simplificado de Card (sem MongoDB)
export interface GameCard {
  id: number; // Índice único (0-52)
  number: number; // 0-8
  type: "level" | "reset" | "pause";
  color?: "purple" | "red" | "blue" | "yellow" | "green";
}

// 53 cartas fixas do jogo (geradas automaticamente)
export const GAME_CARDS: GameCard[] = (() => {
  const cards: GameCard[] = [];
  let id = 0;
  const colors = Object.values(CardColors);

  // 1. Cartas de nível (40 cartas: 8 números × 5 cores = 40)
  for (let number = 1; number <= 8; number++) {
    for (const color of colors) {
      cards.push({ id: id++, number, type: CardTypes.LEVEL, color });
    }
  }

  // 2. Cartas de reset (10 cartas: 2 de cada cor)
  for (const color of colors) {
    for (let i = 0; i < 2; i++) {
      cards.push({ id: id++, number: 0, type: CardTypes.RESET, color });
    }
  }

  // 3. Cartas de pausa (3 cartas - máximo possível)
  for (let i = 0; i < 3; i++) {
    cards.push({ id: id++, number: 0, type: CardTypes.PAUSE });
  }

  return cards;
})();

// Helper para buscar carta por ID
export function getCardById(id: number): GameCard | undefined {
  return GAME_CARDS[id];
}

// Helper para buscar cartas por tipo
export function getCardsByType(type: "level" | "reset" | "pause"): GameCard[] {
  return GAME_CARDS.filter((card) => card.type === type);
}
