import { z } from "zod";

// ──────────────────────────────────────
// POST /forum/posts — Create post (student only)
// ──────────────────────────────────────
export const CreatePostBodySchema = z.object({
  text_content: z
    .string()
    .min(1, "El texto es requerido")
    .max(2000, "Máximo 2000 caracteres"),
});

export type CreatePostBody = z.infer<typeof CreatePostBodySchema>;

// ──────────────────────────────────────
// PATCH /forum/posts/:postId — Update post (owner only)
// ──────────────────────────────────────
export const UpdatePostBodySchema = z.object({
  text_content: z
    .string()
    .min(1, "El texto es requerido")
    .max(2000, "Máximo 2000 caracteres"),
});

export type UpdatePostBody = z.infer<typeof UpdatePostBodySchema>;

// ──────────────────────────────────────
// POST /forum/posts/:postId/comments — Create comment
// ──────────────────────────────────────
export const CreateCommentBodySchema = z.object({
  text_content: z
    .string()
    .min(1, "El texto es requerido")
    .max(1000, "Máximo 1000 caracteres"),
});

export type CreateCommentBody = z.infer<typeof CreateCommentBodySchema>;

// ──────────────────────────────────────
// PATCH /forum/comments/:commentId — Update comment (owner only)
// ──────────────────────────────────────
export const UpdateCommentBodySchema = z.object({
  text_content: z
    .string()
    .min(1, "El texto es requerido")
    .max(1000, "Máximo 1000 caracteres"),
});

export type UpdateCommentBody = z.infer<typeof UpdateCommentBodySchema>;

// ──────────────────────────────────────
// URL params
// ──────────────────────────────────────
export const PostIdParamsSchema = z.object({
  postId: z.string().uuid("ID de publicación inválido"),
});

export type PostIdParams = z.infer<typeof PostIdParamsSchema>;

export const CommentIdParamsSchema = z.object({
  commentId: z.string().uuid("ID de comentario inválido"),
});

export type CommentIdParams = z.infer<typeof CommentIdParamsSchema>;

// ──────────────────────────────────────
// PATCH /forum/profile/avatar — Update avatar on active pseudonym
// ──────────────────────────────────────
export const UpdateAvatarBodySchema = z.object({
  avatar_url: z.string().max(500, "La URL del avatar no puede exceder 500 caracteres"),
});

export type UpdateAvatarBody = z.infer<typeof UpdateAvatarBodySchema>;

// ──────────────────────────────────────
// GET /forum/posts — Query params for listing posts
// ──────────────────────────────────────
export const PostsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type PostsQuery = z.infer<typeof PostsQuerySchema>;
