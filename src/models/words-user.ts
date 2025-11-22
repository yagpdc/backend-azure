import mongoose, { Schema, Document } from "mongoose";
import { z } from "zod";

export const WordsUserConfigSchema = z
  .record(z.string(), z.unknown())
  .default({})
  .transform((value) => value ?? {});

export const CreateWordsUserDtoSchema = z.object({
  name: z.string().min(1),
  streak: z.number().int().min(0).optional(),
  score: z.number().int().min(0).optional(),
  config: WordsUserConfigSchema.optional(),
});

export type CreateWordsUserDto = z.infer<typeof CreateWordsUserDtoSchema>;

export interface WordsAchievements {
  "30_STREAK_INFINITY": boolean;
}

export interface IWordsUser extends Document {
  name: string;
  passwordHash?: string | null;
  streak: number;
  score: number;
  totalTimeSpentMs: number;
  config: Record<string, unknown>;
  infiniteCurrentScore: number;
  infiniteRecord: number;
  infiniteStatus: "idle" | "active" | "failed" | "completed";
  achievements: WordsAchievements;
  createdAt: Date;
  updatedAt: Date;
}

const wordsUserSchema = new Schema<IWordsUser>(
  {
    name: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: false, select: false },
    streak: { type: Number, required: true, default: 0 },
    score: { type: Number, required: true, default: 0 },
    totalTimeSpentMs: { type: Number, required: true, default: 0 },
    config: { type: Schema.Types.Mixed, default: {} },
    infiniteCurrentScore: { type: Number, required: true, default: 0 },
    infiniteRecord: { type: Number, required: true, default: 0 },
    infiniteStatus: {
      type: String,
      required: true,
      enum: ["idle", "active", "failed", "completed"],
      default: "idle",
    },
    achievements: {
      type: Schema.Types.Mixed,
      default: () => ({ "30_STREAK_INFINITY": false }),
    },
  },
  {
    timestamps: true,
  },
);

export const WordsUserModel = mongoose.model<IWordsUser>(
  "WordsUser",
  wordsUserSchema,
);
