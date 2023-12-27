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
export const characterSheetSchemaInput = characterSheetSchema.omit({ characterId: true, isApproved: true, userId: true, isActive: true });

export const storeCharacterSheetSchemaInput = characterSheetSchemaInput.extend({ price: z.number(), isStoreCharacter: z.literal(true) });
export const storeCharacterSheetSchema = characterSheetSchema.extend({ price: z.number(), isStoreCharacter: z.literal(true) });

export type StoreCharacterSheetInput = z.infer<typeof storeCharacterSheetSchemaInput>;
export type CharacterSheetInput = z.infer<typeof characterSheetSchemaInput>;
export type CharacterSheet = z.infer<typeof characterSheetSchema>;
export type StoreCharacterSheet = z.infer<typeof storeCharacterSheetSchema>;
export type CharacterSheetPartial = z.infer<typeof characterSheetSchemaPartial>;
