import { z } from "zod";

export const sendMessageSchema = z.object({
  application_id: z.string().uuid("Invalid application ID"),
  message_text: z
    .string()
    .min(1, "Message cannot be empty")
    .max(5000, "Message cannot exceed 5000 characters"),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
