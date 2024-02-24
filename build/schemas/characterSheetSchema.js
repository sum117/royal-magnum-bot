import { z } from "zod";
import { originEnumSchema, professionEnumSchema } from "./enums";
import { equipmentSlotsSchemaPartial } from "./equipmentSlotsSchema";
import { inventoryItemSchema } from "./itemSchema";
export const characterSheetSchema = z
    .object({
    type: z.literal("character").default("character"),
    name: z.string().min(3).max(32),
    backstory: z.string().min(1).max(2048),
    appearance: z.string().min(1).max(1024),
    origin: originEnumSchema.default("none"),
    gender: z.enum(["male", "female"]),
    characterId: z.string(),
    isApproved: z.boolean().default(false),
    isActive: z.boolean().default(false),
    imageUrl: z.string(),
    userId: z.string(),
    xp: z.number().default(0),
    level: z.number().default(1),
    profession: professionEnumSchema,
    inventory: z.array(inventoryItemSchema).default([]),
})
    .merge(equipmentSlotsSchemaPartial);
export const characterSheetSchemaPartial = characterSheetSchema.partial();
export const characterSheetSchemaInput = characterSheetSchema.omit({
    characterId: true,
    isApproved: true,
    userId: true,
    isActive: true,
    level: true,
    xp: true,
});
export const royalCharacterSchema = characterSheetSchema.extend({
    familySlug: z.string(),
    transformation: z.string().min(1).max(2048),
    royalTitle: z.string().min(1).max(32),
    profession: z.enum(["royal"]).default("royal"),
    type: z.literal("royal").default("royal"),
});
export const royalCharacterSchemaPartial = royalCharacterSchema.partial();
export const royalCharacterSchemaInput = royalCharacterSchema.omit({
    characterId: true,
    isApproved: true,
    userId: true,
    isActive: true,
    level: true,
    xp: true,
});
export const storeCharacterSheetSchemaInput = royalCharacterSchemaInput.extend({
    price: z.number(),
    isStoreCharacter: z.literal(true),
    type: z.literal("store").default("store"),
});
export const storeCharacterSheetSchema = royalCharacterSchema.extend({
    price: z.number(),
    isStoreCharacter: z.literal(true),
    type: z.literal("store").default("store"),
});
export const characterTypeSchema = z.discriminatedUnion("type", [characterSheetSchema, royalCharacterSchema, storeCharacterSheetSchema]);
export const characterTypeSchemaInput = z.discriminatedUnion("type", [characterSheetSchemaInput, royalCharacterSchemaInput, storeCharacterSheetSchemaInput]);
