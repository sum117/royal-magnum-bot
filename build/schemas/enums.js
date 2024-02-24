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
    "mercenary",
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
    "catarsia_survivor",
    "coastsman",
    "corsair",
    "vagabond",
    "orphan",
    "deepwoken",
    "peasant_saint",
    "shadowbound",
    "yor_devotee",
    "terryan",
    "swarm_warden",
    "center_guardian",
    "ethereal",
    "pagan",
    "hunter",
]);
