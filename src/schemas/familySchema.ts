import { z } from "zod";
import { resourcesSchema } from "./resourceSchema";

export const familySchema = z
  .object({
    title: z.string(),
    description: z.string(),
    origin: z.string().default("none"),
    slug: z.string(),
    image: z.string(),
    entity: z.string(),
    population: z.number().default(0),
    populationCap: z.number().default(0),
    populationGrowth: z.number().default(0),
    isApproved: z.boolean().default(false),
  })
  .merge(resourcesSchema);

export const familyInput = familySchema.pick({
  title: true,
  description: true,
  slug: true,
  image: true,
  entity: true,
  origin: true,
});

export const familyUpdateInput = familySchema.partial();

export type FamilyUpdateInput = z.infer<typeof familyUpdateInput>;
export type FamilyInput = z.infer<typeof familyInput>;
export type Family = z.infer<typeof familySchema>;
