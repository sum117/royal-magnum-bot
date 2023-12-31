import { z } from "zod";

export const userSchema = z.object({
  money: z.number(),
  royalTokens: z.number().default(0),
  familyTokens: z.number().default(0),
  lastMessageAt: z
    .string()
    .optional()
    .refine((value) => {
      if (!value) return true;
      const date = new Date(value);
      return date instanceof Date && !isNaN(date.getTime());
    })
    .default(new Date().toISOString())
});
export const userSchemaOptional = userSchema.partial();

export type UserOptional = z.infer<typeof userSchemaOptional>;
export type User = z.infer<typeof userSchema>;
