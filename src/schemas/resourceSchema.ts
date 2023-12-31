import { z } from "zod";

export const resourceEnumSchema = z.enum(["wood", "stone", "iron", "food", "gold"]).default("food");
export const resourcesSchema = z.object({
  wood: z.number().default(0),
  stone: z.number().default(0),
  iron: z.number().default(0),
  food: z.number().default(0),
  gold: z.number().default(0),
});

export type ResourceType = z.infer<typeof resourceEnumSchema>;
export type Resources = z.infer<typeof resourcesSchema>;
