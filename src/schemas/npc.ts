import { z } from "zod";

export const npcSchema = z.object({
  id: z.string(),
  title: z.string(),
  name: z.string(),
  description: z.string(),
  image: z.string(),
  drops: z.array(z.string()).default([]),
  usersWithAccess: z.array(z.string()).default([]),
  price: z.number().default(0),
});

export const npcInputSchema = npcSchema.omit({ id: true });
export const npcInputSchemaPartial = npcInputSchema.partial();
export type NPC = z.infer<typeof npcSchema>;
export type NPCInput = z.infer<typeof npcInputSchema>;
export type NPCInputPartial = z.infer<typeof npcInputSchemaPartial>;
