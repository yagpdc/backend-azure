import { z } from "zod";
import mongoose, { Schema, Document, Types } from "mongoose";

// Status do deck/partida
export const DeckStatus = {
  ACTIVE: "active", // Jogo em andamento
  COMPLETED: "completed", // Jogo finalizado
  PAUSED: "paused", // Jogo pausado
} as const;

// Schema Zod para validação
export const CreateDeckDtoSchema = z.object({
  pauseCards: z.number().int().min(0).max(3).optional().default(3),
  playerName: z.string().optional(),
});

export const UpdateDeckDtoSchema = z.object({
  status: z
    .enum([DeckStatus.ACTIVE, DeckStatus.COMPLETED, DeckStatus.PAUSED])
    .optional(),
  currentCardIndex: z.number().int().min(0).optional(),
  drawnCards: z.array(z.number().int().min(0).max(52)).optional(),
});

export type CreateDeckDto = z.infer<typeof CreateDeckDtoSchema>;
export type UpdateDeckDto = z.infer<typeof UpdateDeckDtoSchema>;

// Interface do documento Mongoose
export interface GameCard {
  id: number; // Índice único (0-52)
  number: number; // 0-8
  type: "level" | "reset" | "pause";
  color?: "purple" | "red" | "blue" | "yellow" | "green";
}

export interface IDeck extends Document {
  cards: GameCard[]; // Array de objetos GameCard
  pauseCards: number; // Quantidade de pause cards (0-3)
  status: (typeof DeckStatus)[keyof typeof DeckStatus];
  currentCardIndex: number; // Índice da próxima carta a ser comprada
  drawnCards: GameCard[]; // Objetos GameCard já comprados/usados
  playerName?: string; // Nome do jogador (opcional)
  createdAt: Date;
  updatedAt: Date;
}

// Schema Mongoose
const deckSchema = new Schema<IDeck>(
  {
    cards: [
      {
        id: { type: Number, required: true },
        number: { type: Number, required: true, min: 0, max: 8 },
        type: {
          type: String,
          required: true,
          enum: ["level", "reset", "pause"],
        },
        color: {
          type: String,
          enum: ["purple", "red", "blue", "yellow", "green"],
        },
      },
    ],
    pauseCards: {
      type: Number,
      required: true,
      min: 0,
      max: 3,
      default: 3,
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(DeckStatus),
      default: DeckStatus.ACTIVE,
    },
    currentCardIndex: {
      type: Number,
      required: true,
      default: 0,
    },
    drawnCards: [
      {
        id: { type: Number, required: true },
        number: { type: Number, required: true, min: 0, max: 8 },
        type: {
          type: String,
          required: true,
          enum: ["level", "reset", "pause"],
        },
        color: {
          type: String,
          enum: ["purple", "red", "blue", "yellow", "green"],
        },
      },
    ],
    playerName: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Model Mongoose
export const DeckModel = mongoose.model<IDeck>("Deck", deckSchema);

// Tipo para respostas da API
export interface Deck {
  _id?: string;
  cards: GameCard[]; // Objetos GameCard
  pauseCards: number;
  status: (typeof DeckStatus)[keyof typeof DeckStatus];
  currentCardIndex: number;
  drawnCards: GameCard[]; // Objetos GameCard já comprados
  playerName?: string;
  createdAt: Date;
  updatedAt: Date;
}
