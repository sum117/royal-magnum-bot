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
export const equipmentSlotEnumSchema = z.enum(["head", "body", "legs", "feet", "rightHand", "leftHand"]);

export type EquipmentSlot = z.infer<typeof equipmentSlotsSchema>;
export type EquipmentPartial = z.infer<typeof equipmentSlotsSchemaPartial>;
export type EquipmentSlotEnum = z.infer<typeof equipmentSlotEnumSchema>;
