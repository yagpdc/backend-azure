import { z } from "zod";
import mongoose, { Schema, Document } from "mongoose";

// Tipos de carta válidos
export const CardTypes = {
  LEVEL: "level", // Cartas com número de 1 a 8 (TEM cor)
  RESET: "reset", // Cartas de reset (valor zero) (TEM cor)
  PAUSE: "pause", // Cartas de pausa (SEM cor)
} as const;

export const CardColors = {
  PURPLE: "purple",
  RED: "red",
  BLUE: "blue",
  YELLOW: "yellow",
  GREEN: "green",
} as const;

export const CreateCardDtoSchema = z.object({
  number: z.number().int().min(0).max(8), // 0 a 8 (0 para reset/pause)
  type: z.enum([CardTypes.LEVEL, CardTypes.RESET, CardTypes.PAUSE]),
  color: z
    .enum([
      CardColors.PURPLE,
      CardColors.RED,
      CardColors.BLUE,
      CardColors.YELLOW,
      CardColors.GREEN,
    ])
    .optional(),
});

export const UpdateCardDtoSchema = z.object({
  number: z.number().int().min(0).max(8).optional(),
  type: z.enum([CardTypes.LEVEL, CardTypes.RESET, CardTypes.PAUSE]).optional(),
  color: z
    .enum([
      CardColors.PURPLE,
      CardColors.RED,
      CardColors.BLUE,
      CardColors.YELLOW,
      CardColors.GREEN,
    ])
    .optional(),
});

export type CreateCardDto = z.infer<typeof CreateCardDtoSchema>;
export type UpdateCardDto = z.infer<typeof UpdateCardDtoSchema>;

// Interface do documento Mongoose
export interface ICard extends Document {
  number: number;
  cardType: (typeof CardTypes)[keyof typeof CardTypes];
  color?: (typeof CardColors)[keyof typeof CardColors];
  createdAt: Date;
  updatedAt?: Date;
}

// Schema Mongoose
const cardSchema = new Schema<ICard>(
  {
    number: {
      type: Number,
      required: true,
      min: 0,
      max: 8,
    },
    cardType: {
      type: String,
      required: true,
      enum: Object.values(CardTypes),
    },
    color: {
      type: String,
      enum: Object.values(CardColors),
      required: false,
    },
  },
  {
    timestamps: true, // Adiciona createdAt e updatedAt automaticamente
  }
);

// Model Mongoose
export const CardModel = mongoose.model<ICard>("Card", cardSchema);

// Tipo do Card completo (para respostas da API)
export interface Card {
  _id?: string;
  number: number;
  type: (typeof CardTypes)[keyof typeof CardTypes];
  color?: (typeof CardColors)[keyof typeof CardColors];
  createdAt: Date;
  updatedAt?: Date;
}
