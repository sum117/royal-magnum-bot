import { z } from "zod";
export const troopsSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    type: z.enum(["infantry", "archers", "cavalry", "siege"]),
    attack: z.number(),
    defense: z.number(),
    health: z.number(),
    speed: z.number(),
    cost: z.number(),
    upkeep: z.number(),
    imageUrl: z.string(),
    quantity: z.number(),
    familySlug: z.string(),
    allies: z.array(z.string()),
});
