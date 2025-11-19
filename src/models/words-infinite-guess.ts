import { z } from "zod";

export const SubmitInfiniteGuessSchema = z.object({
  guessWord: z
    .string()
    .min(5, "Guess must contain 5 letters")
    .max(5, "Guess must contain 5 letters"),
});

export type SubmitInfiniteGuessDto = z.infer<
  typeof SubmitInfiniteGuessSchema
>;
