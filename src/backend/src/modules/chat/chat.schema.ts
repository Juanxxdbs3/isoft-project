import { z } from "zod";

// ──────────────────────────────────────
// URL params
// ──────────────────────────────────────
export const RoomIdParamsSchema = z.object({
  roomId: z.string().uuid("ID de sala inválido"),
});

export type RoomIdParams = z.infer<typeof RoomIdParamsSchema>;

// ──────────────────────────────────────
// POST /chat/rooms/:roomId/messages — Create message
// ──────────────────────────────────────
export const CreateMessageBodySchema = z.object({
  text_content: z
    .string()
    .min(1, "El mensaje no puede estar vacío")
    .max(2000, "Máximo 2000 caracteres"),
  type: z
    .enum(["STANDARD_TEXT", "APPOINTMENT_PROPOSAL", "CHARACTERIZATION_LINK"])
    .default("STANDARD_TEXT"),
});

export type CreateMessageBody = z.infer<typeof CreateMessageBodySchema>;

// ──────────────────────────────────────
// GET /chat/rooms/:roomId/messages — Query params
// ──────────────────────────────────────
export const MessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  before: z.string().datetime().optional(),
});

export type MessagesQuery = z.infer<typeof MessagesQuerySchema>;
