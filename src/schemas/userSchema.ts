import { z } from "zod";

export const userSchema = z.object({
  money: z.number(),
  royalTokens: z.number().default(0),
  familyTokens: z.number().default(0),
});
export const userSchemaOptional = userSchema.partial();

export type UserOptional = z.infer<typeof userSchemaOptional>;
export type User = z.infer<typeof userSchema>;
