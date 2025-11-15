import mongoose, { Schema, Document } from "mongoose";
import { z } from "zod";

export const CreateWordsPuzzleDtoSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .transform((value) => value),
  puzzleWord: z.string().min(1),
  maxAttempts: z.number().int().min(1).max(10).default(6),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateWordsPuzzleDto = z.infer<typeof CreateWordsPuzzleDtoSchema>;

export interface IWordsPuzzle extends Document {
  date: string;
  puzzleWord: string;
  maxAttempts: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const wordsPuzzleSchema = new Schema<IWordsPuzzle>(
  {
    date: { type: String, required: true, unique: true },
    puzzleWord: { type: String, required: true, uppercase: true, trim: true },
    maxAttempts: { type: Number, required: true, default: 6 },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

wordsPuzzleSchema.index({ date: 1 }, { unique: true });

export const WordsPuzzleModel = mongoose.model<IWordsPuzzle>(
  "WordsPuzzle",
  wordsPuzzleSchema,
);
