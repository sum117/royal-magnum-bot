import { z } from "zod";

export const professionEnumSchema = z
  .enum([
    "royal",
    "blacksmith",
    "merchant",
    "farmer",
    "hunter",
    "fisherman",
    "miner",
    "lumberjack",
    "alchemist",
    "cook",
    "tailor",
    "carpenter",
    "librarian",
    "musician",
    "writer",
    "priest",
    "doctor",
    "sailor",
    "soldier",
    "guard",
    "servant",
    "slave",
    "knight",
    "squire",
    "courtier",
    "other",
  ])
  .default("other");
export const itemTypeEnumSchema = z.enum(["weapon", "armor", "consumable", "other"]);
export const itemRarityEnumSchema = z.enum(["common", "uncommon", "rare", "epic", "legendary"]).default("common");
export const equipmentSlotEnumSchema = z.enum(["head", "body", "legs", "feet", "rightHand", "leftHand"]);
export const channelTypeEnumSchema = z.enum(["blacksmith", "tavern", "market", "barracks", "training", "royal", "basic", "clergy", "health"]).default("basic");
export const originEnumSchema = z.enum([
  "none",
  "catarsia-survivor",
  "coastsman",
  "corsair",
  "vagabond",
  "orphan",
  "deepwoken",
  "peasant-saint",
  "shadowbound",
  "yor-devotee",
  "terryan",
  "swarm-warden",
  "center-guardian",
  "ethereal",
  "pagan",
  "hunter",
]);

export type Profession = z.infer<typeof professionEnumSchema>;
export type ChannelType = z.infer<typeof channelTypeEnumSchema>;
export type EquipmentSlotEnum = z.infer<typeof equipmentSlotEnumSchema>;
export type ItemType = z.infer<typeof itemTypeEnumSchema>;
export type ItemRarity = z.infer<typeof itemRarityEnumSchema>;
export type Origin = z.infer<typeof originEnumSchema>;
