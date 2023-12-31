import { z } from "zod";
import { resourceEnumSchema } from "./resourceSchema";
import { troopsSchema } from "./troopsSchema";

export const channelTypeEnumSchema = z.enum(["blacksmith", "tavern", "market", "barracks", "training", "royal", "basic"]).default("basic");
export const channelSchema = z.object({
  placeholderMessageId: z.string().optional(),
  id: z.string(),
  name: z.string(),
  description: z.string(),
  image: z.string(),
  troops: z.array(troopsSchema).default([]),
  conqueredBy: z.string().optional(),
  efficiency: z.number().default(0),
  level: z.number().default(1),
  lastActive: z
    .string()
    .optional()
    .refine((value) => {
      if (!value) return true;
      const date = new Date(value);
      return !isNaN(date.getTime());
    })
    .default(new Date().toISOString()),

  resourceType: resourceEnumSchema,
  type: channelTypeEnumSchema,
});

export type ChannelType = z.infer<typeof channelTypeEnumSchema>;
export const channelInputSchema = channelSchema.omit({
  troops: true,
  lastActive: true,
  conqueredBy: true,
  level: true,
});
export const channelPartialSchema = channelSchema.partial();

export type ChannelInput = z.infer<typeof channelInputSchema>;
export type ChannelPartial = z.infer<typeof channelPartialSchema>;
export type Channel = z.infer<typeof channelSchema>;
