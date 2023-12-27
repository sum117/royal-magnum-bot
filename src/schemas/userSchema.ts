import { z } from "zod";

export const userSchema = z.object({
  money: z.number(),
});

export type User = z.infer<typeof userSchema>;
