import mongoose, { Schema, Document } from "mongoose";

export interface IWordsBankEntry extends Document {
  word: string;
  source?: string;
  createdAt: Date;
  updatedAt: Date;
}

const wordsBankEntrySchema = new Schema<IWordsBankEntry>(
  {
    word: { type: String, required: true, unique: true },
    source: { type: String, default: null },
  },
  { timestamps: true }
);

wordsBankEntrySchema.index({ word: 1 }, { unique: true });

export const WordsBankEntryModel = mongoose.model<IWordsBankEntry>(
  "WordsBankEntry",
  wordsBankEntrySchema
);
