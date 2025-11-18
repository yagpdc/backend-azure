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

export interface IWordsUser extends Document {
  name: string;
  streak: number;
  score: number;
  totalTimeSpentMs: number;
  config: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const wordsUserSchema = new Schema<IWordsUser>(
  {
    name: { type: String, required: true, trim: true },
    streak: { type: Number, required: true, default: 0 },
    score: { type: Number, required: true, default: 0 },
    totalTimeSpentMs: { type: Number, required: true, default: 0 },
    config: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  },
);

export const WordsUserModel = mongoose.model<IWordsUser>(
  "WordsUser",
  wordsUserSchema,
);
