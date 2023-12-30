import { z } from "zod";

export const characterSheetSchema = z.object({
  name: z.string().min(3).max(32),
  backstory: z.string().min(1).max(2048),
  appearance: z.string().min(1).max(1024),
  characterId: z.string(),
  isApproved: z.boolean(),
  isActive: z.boolean(),
  imageUrl: z.string(),
  userId: z.string(),
});
export const characterSheetSchemaPartial = characterSheetSchema.partial();
export const characterSheetSchemaInput = characterSheetSchema.omit({ characterId: true, isApproved: true, userId: true, isActive: true });

export const royalCharacterSchema = characterSheetSchema.extend({
  familySlug: z.string(),
  transformation: z.string().min(1).max(2048),
  royalTitle: z.string().min(1).max(32),
});
export const royalCharacterSchemaPartial = royalCharacterSchema.partial();
export const royalCharacterSchemaInput = royalCharacterSchema.omit({ characterId: true, isApproved: true, userId: true, isActive: true });

export const characterTypeSchema = z.union([characterSheetSchema, royalCharacterSchema]);
export const characterTypeSchemaInput = z.union([characterSheetSchemaInput, royalCharacterSchemaInput]);

export const storeCharacterSheetSchemaInput = royalCharacterSchemaInput.extend({ price: z.number(), isStoreCharacter: z.literal(true) });
export const storeCharacterSheetSchema = royalCharacterSchema.extend({ price: z.number(), isStoreCharacter: z.literal(true) });

export type CharacterSheetInput = z.infer<typeof characterSheetSchemaInput>;
export type CharacterSheet = z.infer<typeof characterSheetSchema>;
export type CharacterSheetPartial = z.infer<typeof characterSheetSchemaPartial>;

export type RoyalCharacterSheet = z.infer<typeof royalCharacterSchema>;
export type RoyalCharacterSheetPartial = z.infer<typeof royalCharacterSchemaPartial>;
export type RoyalCharacterSheetInput = z.infer<typeof royalCharacterSchemaInput>;

export type CharacterSheetType = CharacterSheet | RoyalCharacterSheet;
export type CharacterSheetTypeInput = CharacterSheetInput | RoyalCharacterSheetInput;

export type StoreCharacterSheet = z.infer<typeof storeCharacterSheetSchema>;
export type StoreCharacterSheetInput = z.infer<typeof storeCharacterSheetSchemaInput>;
