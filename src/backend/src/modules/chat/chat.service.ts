import { FastifyBaseLogger } from "fastify";
import { SupabaseClient } from "@supabase/supabase-js";
import { Errors } from "../../lib/errors.js";
import { MessagesQuery } from "./chat.schema.js";

// ──────────────────────────────────────
// ChatService
// ──────────────────────────────────────
export class ChatService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly logger: FastifyBaseLogger
  ) {}

  // ── Helpers ──────────────────────────

  /**
   * Verifies that a chat room exists and that the given user is a member
   * (either as student_id via clinical_case join or as psychologist_id).
   * Throws NOT_FOUND or FORBIDDEN.
   */
  private async verifyRoomMembership(
    roomId: string,
    userId: string
  ): Promise<void> {
    const { data, error } = await this.supabase
      .from("chat_room")
      .select("id, psychologist_id, case:clinical_case!inner(student_id)")
      .eq("id", roomId)
      .single();

    if (error || !data) {
      this.logger.error({ err: error, roomId }, "Chat room not found");
      throw Errors.NOT_FOUND("Sala de chat");
    }

    const isMember =
      data.psychologist_id === userId ||
      (data.case as { student_id: string })?.student_id === userId;

    if (!isMember) {
      this.logger.warn(
        { roomId, userId },
        "User is not a member of this chat room"
      );
      throw Errors.FORBIDDEN("No eres miembro de esta sala de chat");
    }
  }

  // ── Messages ─────────────────────────

  /**
   * Creates a new message in the specified chat room.
   * Verifies room membership first.
   */
  async createMessage(
    roomId: string,
    senderId: string,
    senderRole: string,
    textContent: string,
    type: string = "STANDARD_TEXT"
  ) {
    // Verify the user is a member of this room
    await this.verifyRoomMembership(roomId, senderId);

    const { data, error } = await this.supabase
      .from("chat_message")
      .insert({
        room_id: roomId,
        sender_id: senderId,
        sender_role: senderRole,
        text_content: textContent,
        type,
      })
      .select()
      .single();

    if (error) {
      this.logger.error({ err: error }, "Failed to create chat message");
      throw Errors.INTERNAL_SERVER_ERROR("Error al enviar el mensaje");
    }

    return data;
  }

  /**
   * Retrieves messages for a chat room with cursor-based pagination.
   * Verifies room membership first.
   * Returns messages sorted oldest-first.
   */
  async getMessages(
    roomId: string,
    userId: string,
    query: MessagesQuery
  ) {
    // Verify the user is a member of this room
    await this.verifyRoomMembership(roomId, userId);

    const { limit, before } = query;

    let dbQuery = this.supabase
      .from("chat_message")
      .select("id, room_id, sender_id, sender_role, text_content, type, created_at")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (before) {
      dbQuery = dbQuery.lt("created_at", before);
    }

    const { data, error } = await dbQuery;

    if (error) {
      this.logger.error({ err: error, roomId }, "Failed to get chat messages");
      throw Errors.INTERNAL_SERVER_ERROR("Error al obtener mensajes");
    }

    // Sort ascending so oldest is first
    const messages = (data || []).sort(
      (a: any, b: any) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    return messages;
  }

  // ── Rooms ──────────────────────────

  /**
   * Returns the active chat room(s) for the current user.
   *
   * - For a **student**: returns a single active room (or null) linked to their
   *   opened clinical case.
   * - For a **psychologist**: returns an array of active rooms assigned to them,
   *   each including the student_id from the associated clinical case.
   */
  async getActiveRoom(userId: string, role: "student" | "psychologist") {
    if (role === "student") {
      // 1. Find the student's opened clinical case
      const { data: cases } = await this.supabase
        .from("clinical_case")
        .select("id")
        .eq("student_id", userId)
        .in("status", ["OPENED", "ASSIGNED"])
        .limit(1);

      if (!cases || cases.length === 0) return null;

      // 2. Find the active chat room for that case
      const { data, error } = await this.supabase
        .from("chat_room")
        .select("id, status, opened_at")
        .eq("case_id", cases[0].id)
        .eq("status", "ACTIVE")
        .maybeSingle();

      if (error || !data) return null;

      return { roomId: data.id, status: data.status, openedAt: data.opened_at };
    }

    // ── Psychologist: their active rooms ──
    const { data, error } = await this.supabase
      .from("chat_room")
      .select("id, status, opened_at, case:clinical_case!inner(student_id)")
      .eq("psychologist_id", userId)
      .eq("status", "ACTIVE");

    if (error) return null;

    return data.map((r: any) => ({
      roomId: r.id,
      status: r.status,
      openedAt: r.opened_at,
      studentId: (r.case as { student_id: string })?.student_id,
    }));
  }
}
