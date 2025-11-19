import mongoose, { Schema, Document, Types } from "mongoose";

export interface InfiniteRunGuess {
  attemptNumber: number;
  guessWord: string;
  pattern: string;
  createdAt: Date;
}

export interface InfiniteRunHistoryEntry {
  order: number;
  word: string;
  result: "won" | "lost";
  attemptsUsed: number;
  guesses: InfiniteRunGuess[];
  finishedAt: Date;
}

export interface IWordsInfiniteRun extends Document {
  userId: Types.ObjectId;
  status: "active" | "failed" | "completed";
  currentScore: number;
  maxAttempts: number;
  attemptsUsed: number;
  nextWord: string | null;
  usedWords: string[];
  currentGuesses: InfiniteRunGuess[];
  history: InfiniteRunHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const guessSchema = new Schema<InfiniteRunGuess>(
  {
    attemptNumber: { type: Number, required: true },
    guessWord: { type: String, required: true },
    pattern: { type: String, required: true },
    createdAt: { type: Date, required: true, default: () => new Date() },
  },
  { _id: false },
);

const historySchema = new Schema<InfiniteRunHistoryEntry>(
  {
    order: { type: Number, required: true },
    word: { type: String, required: true },
    result: { type: String, required: true, enum: ["won", "lost"] },
    attemptsUsed: { type: Number, required: true },
    finishedAt: { type: Date, required: true, default: () => new Date() },
    guesses: { type: [guessSchema], default: [] },
  },
  { _id: false },
);

const wordsInfiniteRunSchema = new Schema<IWordsInfiniteRun>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: "WordsUser" },
    status: {
      type: String,
      required: true,
      enum: ["active", "failed", "completed"],
      default: "active",
    },
    currentScore: { type: Number, required: true, default: 0 },
    maxAttempts: { type: Number, required: true, default: 4 },
    attemptsUsed: { type: Number, required: true, default: 0 },
    nextWord: { type: String, default: null },
    usedWords: { type: [String], default: [] },
    currentGuesses: { type: [guessSchema], default: [] },
    history: { type: [historySchema], default: [] },
  },
  { timestamps: true },
);

wordsInfiniteRunSchema.index({ userId: 1, status: 1 });

export const WordsInfiniteRunModel = mongoose.model<IWordsInfiniteRun>(
  "WordsInfiniteRun",
  wordsInfiniteRunSchema,
);
