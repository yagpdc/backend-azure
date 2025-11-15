import { z } from "zod";

export const SubmitDailyGuessSchema = z.object({
  guessWord: z
    .string()
    .trim()
    .length(5, "A palavra precisa ter exatamente 5 letras")
    .regex(/^[A-Za-z]+$/, "A palavra deve conter apenas letras"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  dailyId: z
    .string()
    .regex(/^\d{8}$/)
    .optional(),
});

export type SubmitDailyGuessDto = z.infer<typeof SubmitDailyGuessSchema>;
