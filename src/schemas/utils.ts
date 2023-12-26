import { z } from "zod";

export const imageGifUrl = z
  .string()
  .url()
  .refine((url) => {
    const isMediaUrl = url.includes(".png") || url.includes(".jpg") || url.includes(".jpeg") || url.includes(".gif");
    return isMediaUrl;
  });
