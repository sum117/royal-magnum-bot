import { z } from "zod";

export const family = z.object({
  title: z.string(),
  description: z.string(),
  slug: z.string(),
  image: z.string(),
});

export type Family = z.infer<typeof family>;
