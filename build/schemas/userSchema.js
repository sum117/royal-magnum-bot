import { z } from "zod";
export const userSchema = z.object({
    money: z.number(),
    royalTokens: z.number().default(0),
    doesNotUseEmbed: z.boolean().default(false),
    achievements: z.array(z.string()).default([]),
    familyTokens: z.number().default(0),
    currentNpcId: z.string().optional(),
    lastMessageAt: z.date().optional(),
});
export const userSchemaOptional = userSchema.partial();
