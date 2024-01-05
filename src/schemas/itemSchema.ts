import { z } from "zod";
import { resourcesSchema } from "./resourceSchema";
import { equipmentSlotEnumSchema } from "./equipmentSlotsSchema";
import { BASE_ITEM_IMAGE_URL } from "../data/constants";
import { professionEnumSchema } from "./characterSheetSchema";

export const itemTypeEnumSchema = z.enum(["weapon", "armor", "consumable", "other"]);
export const itemRarityEnumSchema = z.enum(["common", "uncommon", "rare", "epic", "legendary"]).default("common");
export const itemSchema = z.object({
  itemType: itemTypeEnumSchema,
  name: z.string(),
  description: z.string(),
  image: z.string().default(BASE_ITEM_IMAGE_URL),
  madeBy: z.string().default("system"),
  rarity: itemRarityEnumSchema,
  id: z.string(),
});

export const itemRecipeSchema = resourcesSchema.extend({
  itemId: z.string(),
  profession: professionEnumSchema,
  level: z.number().default(1),
});
export const equipmentItemSchema = itemSchema.extend({
  itemType: z.literal("weapon").or(z.literal("armor")),
  slot: equipmentSlotEnumSchema,
  attack: z.number().default(0),
  defense: z.number().default(0),
  health: z.number().default(0),
  speed: z.number().default(0),
  range: z.number().default(0),
  level: z.number().default(1),
});

export const consumableItemSchema = itemSchema.extend({
  itemType: z.literal("consumable"),
  hunger: z.number().default(0),
  thirst: z.number().default(0),
  health: z.number().default(0),
  stamina: z.number().default(0),
  duration: z.number().default(0),
});

export const otherItemSchema = itemSchema.extend({
  itemType: z.literal("other"),
});

export const inventoryItemSchema = z.object({
  itemId: z.string(),
  quantity: z.number().default(1),
  isEquipped: z.boolean().default(false),
});

export const inventoryItemSchemaPartial = inventoryItemSchema.partial();

export type ItemRecipe = z.infer<typeof itemRecipeSchema>;
export type InventoryItemPartial = z.infer<typeof inventoryItemSchemaPartial>;
export type InventoryItem = z.infer<typeof inventoryItemSchema>;
export type EquipmentItem = z.infer<typeof equipmentItemSchema>;
export type ConsumableItem = z.infer<typeof consumableItemSchema>;
export type OtherItem = z.infer<typeof otherItemSchema>;
export type ItemType = z.infer<typeof itemTypeEnumSchema>;
export type ItemRarity = z.infer<typeof itemRarityEnumSchema>;
export type Item = EquipmentItem | ConsumableItem | OtherItem;
