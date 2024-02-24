import { z } from "zod";
export const equipmentSlotsSchema = z.object({
    head: z.string(),
    body: z.string(),
    legs: z.string(),
    feet: z.string(),
    rightHand: z.string(),
    leftHand: z.string(),
});
export const equipmentSlotsSchemaPartial = equipmentSlotsSchema.partial();
