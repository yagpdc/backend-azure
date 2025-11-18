import { z } from "zod";
import type { WordsAvatarConfig } from "../config/words-avatar";

const stringOrNull = z.union([z.string().min(1), z.null()]);

export const UpdateWordsAvatarSchema = z.object({
  frogType: stringOrNull,
  hat: stringOrNull,
  body: stringOrNull,
  background: stringOrNull,
});

export type UpdateWordsAvatarDto = z.infer<typeof UpdateWordsAvatarSchema>;

export type { WordsAvatarConfig };
