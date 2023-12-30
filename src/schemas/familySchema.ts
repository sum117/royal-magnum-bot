import { z } from "zod";

export const resourcesSchema = z.object({
  wood: z.number().default(0),
  stone: z.number().default(0),
  iron: z.number().default(0),
  food: z.number().default(0),
  gold: z.number().default(0),
});

export const familySchema = z
  .object({
    title: z.string(),
    description: z.string(),
    slug: z.string(),
    image: z.string(),
    population: z.number().default(0),
    populationCap: z.number().default(0),
    populationGrowth: z.number().default(0),
  })
  .merge(resourcesSchema);

export type Family = z.infer<typeof familySchema>;
