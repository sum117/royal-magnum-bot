import { z } from "zod";
export const messageSchema = z.object({
    id: z.string(),
    channelId: z.string(),
    content: z.string(),
    authorId: z.string(),
});
