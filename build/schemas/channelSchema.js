import { z } from "zod";
import { channelTypeEnumSchema } from "./enums";
import { resourceEnumSchema } from "./resourceSchema";
import { troopsSchema } from "./troopsSchema";
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
    lastActive: z.date().optional(),
    resourceType: resourceEnumSchema,
    type: channelTypeEnumSchema,
});
export const channelInputSchema = channelSchema.omit({
    troops: true,
    lastActive: true,
    conqueredBy: true,
    level: true,
});
export const channelPartialSchema = channelSchema.partial();
