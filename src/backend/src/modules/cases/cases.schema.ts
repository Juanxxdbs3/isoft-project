import { z } from "zod";

export const CaseIdParamsSchema = z.object({
  caseId: z.string().uuid("ID de caso inválido"),
});

export type CaseIdParams = z.infer<typeof CaseIdParamsSchema>;

export const CreateCaseBodySchema = z.object({}).strict();

export type CreateCaseBody = z.infer<typeof CreateCaseBodySchema>;

export const FormalActiveParamsSchema = z.object({
  caseId: z.string().uuid("ID de caso inválido"),
});

export type FormalActiveParams = z.infer<typeof FormalActiveParamsSchema>;

export const CasesQuerySchema = z.object({
  status: z.enum(["OPENED", "ASSIGNED", "ARCHIVED", "RESOLVED"]).optional(),
});

export type CasesQuery = z.infer<typeof CasesQuerySchema>;

// ── Chat ──

export const ChatMessagesQuerySchema = z.object({
  cursor: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type ChatMessagesQuery = z.infer<typeof ChatMessagesQuerySchema>;

export const CreateChatMessageBodySchema = z.object({
  text_content: z
    .string()
    .min(1, "El mensaje no puede estar vacío")
    .max(2000, "Máximo 2000 caracteres"),
  message_type: z
    .enum(["STANDARD_TEXT", "APPOINTMENT_PROPOSAL", "CHARACTERIZATION_LINK"])
    .default("STANDARD_TEXT"),
});

export type CreateChatMessageBody = z.infer<typeof CreateChatMessageBodySchema>;

export const ArchiveChatBodySchema = z.object({
  status: z.literal("ARCHIVED"),
});

export type ArchiveChatBody = z.infer<typeof ArchiveChatBodySchema>;

// ── Consent ──

export const CreateConsentBodySchema = z.object({
  document_version: z.string().min(1, "La versión del documento es requerida"),
});

export type CreateConsentBody = z.infer<typeof CreateConsentBodySchema>;
