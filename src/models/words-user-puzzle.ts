import mongoose, { Schema, Document, Types } from "mongoose";
import { z } from "zod";

export const WordsGuessSchema = z.object({
  attemptNumber: z.number().int().min(1),
  guessWord: z.string().min(1),
  pattern: z.string().min(1),
  createdAt: z.string().datetime().optional(),
});

export const CreateWordsHistoryEntrySchema = z.object({
  puzzleId: z.string().min(1),
  status: z.enum(["won", "lost", "abandoned", "in_progress"]),
  attemptsUsed: z.number().int().min(0),
  maxAttempts: z.number().int().min(1).max(10).optional(),
  score: z.number().int().min(0).default(0),
  guesses: z.array(WordsGuessSchema).default([]),
  finishedAt: z.string().datetime().nullable().optional(),
});

export type CreateWordsHistoryEntryDto = z.infer<
  typeof CreateWordsHistoryEntrySchema
>;

export interface IWordsGuess {
  attemptNumber: number;
  guessWord: string;
  pattern: string;
  createdAt: Date;
}

export interface IWordsUserPuzzle extends Document {
  userId: Types.ObjectId;
  puzzleId: Types.ObjectId;
  puzzleWord: string;
  date: string;
  status: "won" | "lost" | "abandoned" | "in_progress";
  attemptsUsed: number;
  maxAttempts: number;
  score: number;
  guesses: IWordsGuess[];
  createdAt: Date;
  updatedAt: Date;
  finishedAt?: Date | null;
}

const guessSchema = new Schema<IWordsGuess>(
  {
    attemptNumber: { type: Number, required: true },
    guessWord: { type: String, required: true, uppercase: true, trim: true },
    pattern: { type: String, required: true },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false }
);

const wordsUserPuzzleSchema = new Schema<IWordsUserPuzzle>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "WordsUser",
      required: true,
      index: true,
    },
    puzzleId: {
      type: Schema.Types.ObjectId,
      ref: "WordsPuzzle",
      required: true,
    },
    puzzleWord: { type: String, required: true },
    date: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ["won", "lost", "abandoned", "in_progress"],
    },
    attemptsUsed: { type: Number, required: true },
    maxAttempts: { type: Number, required: true },
    score: { type: Number, required: true, default: 0 },
    guesses: { type: [guessSchema], default: [] },
    finishedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

wordsUserPuzzleSchema.index({ userId: 1, date: -1 });

export const WordsUserPuzzleModel = mongoose.model<IWordsUserPuzzle>(
  "WordsUserPuzzle",
  wordsUserPuzzleSchema
);
