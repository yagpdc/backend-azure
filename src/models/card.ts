import { z } from "zod";

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
  numero: z.number().int().min(0).max(8), // 0 a 8 (0 para reset/pause)
  tipo: z.enum([CardTypes.LEVEL, CardTypes.RESET, CardTypes.PAUSE]),
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
  numero: z.number().int().min(0).max(8).optional(),
  tipo: z.enum([CardTypes.LEVEL, CardTypes.RESET, CardTypes.PAUSE]).optional(),
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

// Tipo do Card completo (com _id do MongoDB)
export interface Card {
  _id?: string;
  numero: number;
  tipo: (typeof CardTypes)[keyof typeof CardTypes];
  color?: (typeof CardColors)[keyof typeof CardColors]; // Opcional: só level e reset têm cor
  createdAt: Date;
  updatedAt?: Date;
}
