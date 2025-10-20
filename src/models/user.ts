import { z } from "zod";

export const CreateUserDtoSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

export type CreateUserDto = z.infer<typeof CreateUserDtoSchema>;
