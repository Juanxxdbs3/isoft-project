import { FastifyBaseLogger } from "fastify";
import { SupabaseClient } from "@supabase/supabase-js";
import { Errors } from "../../lib/errors.js";
import { PostsQuery } from "./forum.schema.js";

// ──────────────────────────────────────
// ForumService
// ──────────────────────────────────────
export class ForumService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly logger: FastifyBaseLogger,
  ) {}

  // ── Helpers ──────────────────────────

  /**
   * Returns the active pseudonym text for a given student.
   * Throws NOT_FOUND if no active pseudonym exists.
   */
  async getActivePseudonym(studentId: string): Promise<string> {
    const { data, error } = await this.supabase
      .from("pseudonym")
      .select("texto")
      .eq("student_id", studentId)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (error || !data) {
      this.logger.error({ err: error, studentId }, "No active pseudonym found");
      throw Errors.NOT_FOUND("Seudónimo activo");
    }

    return data.texto;
  }

  /**
   * Updates the avatar_url on the student's active pseudonym.
   * Throws NOT_FOUND if no active pseudonym exists.
   * Returns the updated avatar_url.
   */
  async updateAvatar(
    studentId: string,
    avatarUrl: string,
  ): Promise<{ avatar_url: string | null }> {
    // Find the active pseudonym for this student
    const { data: pseudonym, error: findError } = await this.supabase
      .from("pseudonym")
      .select("id")
      .eq("student_id", studentId)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (findError || !pseudonym) {
      this.logger.error(
        { err: findError, studentId },
        "No active pseudonym found for avatar update",
      );
      throw Errors.NOT_FOUND("Seudónimo activo");
    }

    // Update the avatar_url on that pseudonym
    const { data, error: updateError } = await this.supabase
      .from("pseudonym")
      .update({ avatar_url: avatarUrl })
      .eq("id", pseudonym.id)
      .select("avatar_url")
      .single();

    if (updateError) {
      this.logger.error(
        { err: updateError, studentId },
        "Failed to update avatar URL",
      );
      throw Errors.INTERNAL_SERVER_ERROR(
        "Error al actualizar la URL del avatar",
      );
    }

    return { avatar_url: data.avatar_url };
  }

  /**
   * Verifies that post exists, is not deleted, and belongs to studentId.
   * Throws NOT_FOUND or FORBIDDEN accordingly.
   */
  private async checkPostOwnership(
    postId: string,
    studentId: string,
  ): Promise<void> {
    const { data, error } = await this.supabase
      .from("post")
      .select("student_id, status")
      .eq("id", postId)
      .single();

    if (error || !data) {
      throw Errors.NOT_FOUND("Publicación");
    }

    if (data.status === "DELETED") {
      throw Errors.NOT_FOUND("Publicación");
    }

    if (data.student_id !== studentId) {
      throw Errors.FORBIDDEN("No puedes modificar esta publicación");
    }
  }

  /**
   * Verifies that comment exists, is not deleted, and belongs to studentId.
   * Throws NOT_FOUND or FORBIDDEN accordingly.
   */
  private async checkCommentOwnership(
    commentId: string,
    studentId: string,
  ): Promise<void> {
    const { data, error } = await this.supabase
      .from("comment")
      .select("student_id, status")
      .eq("id", commentId)
      .single();

    if (error || !data) {
      throw Errors.NOT_FOUND("Comentario");
    }

    if (data.status === "DELETED") {
      throw Errors.NOT_FOUND("Comentario");
    }

    if (data.student_id !== studentId) {
      throw Errors.FORBIDDEN("No puedes modificar este comentario");
    }
  }

  // ── Posts ────────────────────────────

  /**
   * Creates a new post.
   */
  async createPost(studentId: string, textContent: string) {
    const { data, error } = await this.supabase
      .from("post")
      .insert({
        student_id: studentId,
        text_content: textContent,
        status: "VISIBLE",
      })
      .select()
      .single();

    if (error) {
      this.logger.error({ err: error }, "Failed to create post");
      throw Errors.INTERNAL_SERVER_ERROR("Error al crear la publicación");
    }

    return data;
  }

  /**
   * Updates the text_content of an existing post after verifying ownership.
   */
  async updatePost(postId: string, studentId: string, textContent: string) {
    await this.checkPostOwnership(postId, studentId);

    const { data, error } = await this.supabase
      .from("post")
      .update({ text_content: textContent })
      .eq("id", postId)
      .select()
      .single();

    if (error) {
      this.logger.error({ err: error }, "Failed to update post");
      throw Errors.INTERNAL_SERVER_ERROR("Error al actualizar la publicación");
    }

    return data;
  }

  /**
   * Soft-deletes a post by setting status to 'DELETED'.
   */
  async deletePost(postId: string, studentId: string) {
    await this.checkPostOwnership(postId, studentId);

    const { error } = await this.supabase
      .from("post")
      .update({ status: "DELETED" })
      .eq("id", postId);

    if (error) {
      this.logger.error({ err: error }, "Failed to delete post");
      throw Errors.INTERNAL_SERVER_ERROR("Error al eliminar la publicación");
    }

    return { deleted: true };
  }

  // ── Comments ─────────────────────────

  /**
   * Creates a comment on a post. Verifies the target post exists and is visible.
   */
  async createComment(postId: string, studentId: string, textContent: string) {
    // Verify the post exists and is visible
    const { data: post, error: postError } = await this.supabase
      .from("post")
      .select("id")
      .eq("id", postId)
      .eq("status", "VISIBLE")
      .single();

    if (postError || !post) {
      throw Errors.NOT_FOUND("Publicación");
    }

    const { data, error } = await this.supabase
      .from("comment")
      .insert({
        student_id: studentId,
        post_id: postId,
        text_content: textContent,
        status: "VISIBLE",
      })
      .select()
      .single();

    if (error) {
      this.logger.error({ err: error }, "Failed to create comment");
      throw Errors.INTERNAL_SERVER_ERROR("Error al crear el comentario");
    }

    return data;
  }

  /**
   * Updates the text_content of an existing comment after verifying ownership.
   */
  async updateComment(
    commentId: string,
    studentId: string,
    textContent: string,
  ) {
    await this.checkCommentOwnership(commentId, studentId);

    const { data, error } = await this.supabase
      .from("comment")
      .update({ text_content: textContent })
      .eq("id", commentId)
      .select()
      .single();

    if (error) {
      this.logger.error({ err: error }, "Failed to update comment");
      throw Errors.INTERNAL_SERVER_ERROR("Error al actualizar el comentario");
    }

    return data;
  }

  /**
   * Soft-deletes a comment by setting status to 'DELETED'.
   */
  async deleteComment(commentId: string, studentId: string) {
    await this.checkCommentOwnership(commentId, studentId);

    const { error } = await this.supabase
      .from("comment")
      .update({ status: "DELETED" })
      .eq("id", commentId);

    if (error) {
      this.logger.error({ err: error }, "Failed to delete comment");
      throw Errors.INTERNAL_SERVER_ERROR("Error al eliminar el comentario");
    }

    return { deleted: true };
  }

  // ── List / Read ──────────────────────

  /**
   * Lists all visible posts with pagination.
   * Flattens the joined pseudonym and campus into the response.
   */
  async listPosts(query: PostsQuery) {
    const { page, limit } = query;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await this.supabase
      .from("post")
      .select(
        `
        id,
        text_content,
        created_at,
        status,
        comment:comment(count),
        student:student_id (
          campus,
          pseudonym:student_active_pseudonym_id_fkey (
            texto,
            avatar_url
          )
        )
      `,
        { count: "exact" },
      )
      .eq("status", "VISIBLE")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      this.logger.error({ err: error }, "Failed to list posts");
      throw Errors.INTERNAL_SERVER_ERROR("Error al obtener publicaciones");
    }

    // Flatten the nested structure for the frontend
    const posts = (data || []).map((post: any) => ({
      id: post.id,
      text: post.text_content,
      createdAt: post.created_at,
      status: post.status,
      commentCount: (post as any).comment?.[0]?.count || 0,
      pseudonym: post.student?.pseudonym?.texto || "Anónimo",
      campus: post.student?.campus || null,
      avatar_url: post.student?.pseudonym?.avatar_url || null,
    }));

    return { posts, total: count || 0, page, limit };
  }

  /**
   * Lists the current student's own visible posts.
   */
  async getMyPosts(studentId: string) {
    const { data, error } = await this.supabase
      .from("post")
      .select(
        `
        id,
        text_content,
        created_at,
        status,
        comment:comment(count),
        student:student_id (
          campus,
          pseudonym:student_active_pseudonym_id_fkey (
            texto,
            avatar_url
          )
        )
      `,
      )
      .eq("status", "VISIBLE")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    if (error) {
      this.logger.error({ err: error }, "Failed to get my posts");
      throw Errors.INTERNAL_SERVER_ERROR("Error al obtener tus publicaciones");
    }

    const posts = (data || []).map((post: any) => ({
      id: post.id,
      text: post.text_content,
      createdAt: post.created_at,
      status: post.status,
      commentCount: (post as any).comment?.[0]?.count || 0,
      pseudonym: post.student?.pseudonym?.texto || "Anónimo",
      campus: post.student?.campus || null,
      avatar_url: post.student?.pseudonym?.avatar_url || null,
    }));

    return posts;
  }

  /**
   * Retrieves a single visible post by ID with its pseudonym and campus.
   */
  async getPostById(postId: string) {
    const { data, error } = await this.supabase
      .from("post")
      .select(
        `
        id,
        text_content,
        created_at,
        status,
        comment:comment(count),
        student:student_id (
          campus,
          pseudonym:student_active_pseudonym_id_fkey (
            texto,
            avatar_url
          )
        )
      `,
      )
      .eq("id", postId)
      .eq("status", "VISIBLE")
      .single();

    if (error || !data) {
      this.logger.error({ err: error, postId }, "Failed to get post by id");
      throw Errors.NOT_FOUND("Publicación");
    }

    return {
      id: data.id,
      text: data.text_content,
      createdAt: data.created_at,
      status: data.status,
      commentCount: (data as any).comment?.[0]?.count || 0,
      pseudonym: (data as any).student?.pseudonym?.texto || "Anónimo",
      campus: (data as any).student?.campus || null,
      avatar_url: (data as any).student?.pseudonym?.avatar_url || null,
    };
  }

  /**
   * Lists visible comments for a post with their pseudonyms.
   */
  async getPostComments(postId: string) {
    const { data, error } = await this.supabase
      .from("comment")
      .select(
        `
        id,
        text_content,
        created_at,
        status,
        student:student_id (
          pseudonym:student_active_pseudonym_id_fkey (
            texto,
            avatar_url
          )
        )
      `,
      )
      .eq("post_id", postId)
      .eq("status", "VISIBLE")
      .order("created_at", { ascending: true });

    if (error) {
      this.logger.error({ err: error, postId }, "Failed to get comments");
      throw Errors.INTERNAL_SERVER_ERROR("Error al obtener comentarios");
    }

    return (data || []).map((comment: any) => ({
      id: comment.id,
      text: comment.text_content,
      createdAt: comment.created_at,
      status: comment.status,
      pseudonym: comment.student?.pseudonym?.texto || "Anónimo",
      avatar_url: comment.student?.pseudonym?.avatar_url || null,
    }));
  }
}
