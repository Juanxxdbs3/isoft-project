import { FastifyBaseLogger } from "fastify";
import { SupabaseClient } from "@supabase/supabase-js";
import { Errors } from "../../lib/errors.js";
import { PostsQuery } from "./forum.schema.js";
import { NLPService } from "../nlp/nlp.service.js";
import { IAlertRepository, ICaseRepository } from "../../repositories/interfaces.js";

export class ForumService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly logger: FastifyBaseLogger,
    private readonly nlpService: NLPService,
    private readonly alertRepo: IAlertRepository,
    private readonly caseRepo: ICaseRepository,
  ) {}

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

  async updateAvatar(
    studentId: string,
    avatarUrl: string,
  ): Promise<{ avatar_url: string | null }> {
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
      throw Errors.INTERNAL_SERVER_ERROR("Error al actualizar la URL del avatar");
    }

    return { avatar_url: data.avatar_url };
  }

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

  async createPost(studentId: string, textContent: string) {
    const { data: post, error } = await this.supabase
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

    this._runTriagePipeline(post.id, studentId, textContent, "POST").catch(
      (err) =>
        this.logger.error({ err, postId: post.id }, "Triage pipeline error"),
    );

    return post;
  }

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

  async createComment(postId: string, studentId: string, textContent: string) {
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

  private async _runTriagePipeline(
    contentId: string,
    studentId: string,
    text: string,
    contentType: "POST" | "COMMENT",
  ) {
    const nlpResult = await this.nlpService.analyze({
      id_publicacion: contentId,
      id_seudonimo: studentId,
      texto: text,
      timestamp: new Date().toISOString(),
      incluir_explicabilidad: false,
    });

    if (!nlpResult || nlpResult.status === "error") {
      this.logger.warn({ contentId }, "NLP returned null or error — skipping triage");
      return;
    }

    if (nlpResult.community?.moderation_decision === "REJECTED") {
      await this.supabase
        .from(contentType === "POST" ? "post" : "comment")
        .update({ status: "MODERATED" })
        .eq("id", contentId);
      this.logger.info({ contentId }, "Content moderated by community classifier");
    }

    if (!nlpResult.clinical || !nlpResult.texto_suficiente) return;

    const {
      risk_level,
      p_depresion,
      p_ansiedad,
      p_suicida,
      imb,
      suicidal_override,
    } = nlpResult.clinical;

    if (risk_level === "LOW" && !nlpResult.safety_filter_triggered) return;

    const { data: nlpRecord } = await this.supabase
      .from("nlp_analysis")
      .insert({
        post_id: contentType === "POST" ? contentId : null,
        comment_id: contentType === "COMMENT" ? contentId : null,
        content_type: contentType,
        analyzed_text_snapshot: text,
        depressive_probability: p_depresion,
        anxiety_probability: p_ansiedad,
        suicidal_probability: p_suicida,
        base_malaise_index: imb,
        suicidal_override: suicidal_override ?? false,
        community_rules_infraction:
          nlpResult.community?.moderation_decision === "REJECTED",
        risk_level: nlpResult.safety_filter_triggered ? "HIGH" : risk_level,
      })
      .select("id")
      .single();

    if (!nlpRecord) return;

    let caseId: string;
    const existingCase = await this.caseRepo.findActiveByStudent(studentId);

    if (existingCase) {
      caseId = existingCase.id;
    } else {
      const newCase = await this.supabase
        .from("clinical_case")
        .insert({
          student_id: studentId,
          case_type: "AUTOMATIC_ALERT",
          status: "OPENED",
        })
        .select("id")
        .single();
      if (!newCase.data) return;
      caseId = newCase.data.id;
    }

    const { data: student } = await this.supabase
      .from("student")
      .select("campus, caso_formal_activo")
      .eq("id", studentId)
      .maybeSingle();

    if (!student) return;

    await this.supabase.from("alert").insert({
      case_id: caseId,
      nlp_analysis_id: nlpRecord.id,
      student_id: studentId,
      campus: student.campus,
      risk_level: nlpResult.safety_filter_triggered ? "HIGH" : risk_level,
      status: "PENDING",
      is_complementary: !!existingCase && student.caso_formal_activo,
    });

    this.logger.info(
      { contentId, studentId, risk_level, caseId },
      "Alert created from triage pipeline",
    );

    this.logger.info(
      { campus: student.campus, risk_level },
      "STUB: Notification to psychologist would fire here (RF15 pending)",
    );
  }
}
