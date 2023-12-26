import { z } from "zod";

export const characterSheetSchema = z.object({
  name: z.string().min(3).max(32),
  royalTitle: z.string().min(1).max(32),
  backstory: z.string().min(1).max(2048),
  appearance: z.string().min(1).max(1024),
  transformation: z.string().min(1).max(2048),
  characterId: z.string(),
  isApproved: z.boolean(),
  isActive: z.boolean(),
  imageUrl: z.string(),
  userId: z.string(),
  familySlug: z.string(),
});

export const characterSheetSchemaPartial = characterSheetSchema.partial();

export type CharacterSheet = z.infer<typeof characterSheetSchema>;
export type CharacterSheetPartial = z.infer<typeof characterSheetSchemaPartial>;

export const characterSheetSchemaInput = characterSheetSchema.omit({ characterId: true, isApproved: true, userId: true, isActive: true });

export type CharacterSheetInput = z.infer<typeof characterSheetSchemaInput>;
