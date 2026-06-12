import { FastifyBaseLogger } from "fastify";
import { SupabaseClient } from "@supabase/supabase-js";
import { ICaseRepository } from "../../repositories/interfaces.js";
import { Errors, createError } from "../../lib/errors.js";
import { CONFIG } from "../../config.js";
import { decryptStudentCode } from "../../lib/encryption.js";
import type { ChatMessagesQuery, CreateChatMessageBody } from "./cases.schema.js";

export class CasesService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly logger: FastifyBaseLogger,
    private readonly caseRepo: ICaseRepository,
  ) {}

  private async verifyCaseAccess(caseId: string, userId: string, userRole: "student" | "psychologist", campus?: string) {
    const caseData = await this.caseRepo.findById(caseId);

    if (!caseData) {
      throw Errors.NOT_FOUND("Caso clínico");
    }

    if (userRole === "student" && caseData.student_id !== userId) {
      throw createError("FORBIDDEN", "No tienes acceso a este caso", 403);
    }

    if (userRole === "psychologist" && caseData.assigned_psychologist_id !== userId) {
      throw createError("FORBIDDEN", "No eres el psicólogo asignado a este caso", 403);
    }

    if (userRole === "psychologist" && campus) {
      const { data: student } = await this.supabase
        .from("student")
        .select("campus")
        .eq("id", caseData.student_id)
        .maybeSingle();

      if (student && student.campus !== campus) {
        throw createError("FORBIDDEN", "El estudiante no pertenece a tu sede", 403);
      }
    }

    return caseData;
  }

  async listCases(psychologistId: string, query?: { status?: string }) {
    let dbQuery = this.supabase
      .from("clinical_case")
      .select(`
        id,
        student_id,
        case_type,
        status,
        assigned_psychologist_id,
        is_unsubscribed_from_recapture,
        opened_at,
        updated_at,
        student!inner (
          pseudonym!fk_student_active_pseudonym (
            texto,
            avatar_url
          )
        )
      `)
      .eq("assigned_psychologist_id", psychologistId);

    if (query?.status) {
      dbQuery = dbQuery.eq("status", query.status);
    } else {
      dbQuery = dbQuery.in("status", ["OPENED", "ASSIGNED"]);
    }

    dbQuery = dbQuery.order("opened_at", { ascending: false });

    const { data, error } = await dbQuery;

    if (error) {
      this.logger.error({ err: error, psychologistId }, "Failed to list cases");
      throw Errors.INTERNAL_SERVER_ERROR("Error al obtener casos");
    }

    return (data || []).map((c: any) => {
      const pseudonymObj = c.student?.pseudonym;
      return {
        id: c.id,
        student_id: c.student_id,
        case_type: c.case_type,
        status: c.status,
        assigned_psychologist_id: c.assigned_psychologist_id,
        is_unsubscribed_from_recapture: c.is_unsubscribed_from_recapture,
        opened_at: c.opened_at,
        updated_at: c.updated_at,
        anonymous_alias: pseudonymObj?.texto || null,
        avatar_url: pseudonymObj?.avatar_url || null,
      };
    });
  }

  async getCaseById(caseId: string, psychologistId: string) {
    const { data: caseData, error } = await this.supabase
      .from("clinical_case")
      .select(`
        *,
        student!inner (
          codigo_estudiante_encrypted,
          campus,
          caso_formal_activo,
          pseudonym!fk_student_active_pseudonym (
            texto,
            avatar_url
          )
        )
      `)
      .eq("id", caseId)
      .maybeSingle();

    if (error || !caseData) {
      throw Errors.NOT_FOUND("Caso clínico");
    }

    if ((caseData as any).assigned_psychologist_id !== psychologistId) {
      throw createError(
        "FORBIDDEN",
        "No tienes acceso a este caso",
        403,
      );
    }

    const c = caseData as any;
    const studentId = c.student_id;
    const pseudonymObj = c.student?.pseudonym;

    const { data: alerts } = await this.supabase
      .from("alert")
      .select("id, risk_level, status, generated_at, is_complementary")
      .eq("case_id", caseId)
      .order("generated_at", { ascending: false });

    const { data: compData } = await this.supabase
      .from("complementary_data")
      .select("nombre_completo, programa, semestre, correo_contacto")
      .eq("student_id", studentId)
      .maybeSingle();

    let decryptedCode = "";
    try {
      decryptedCode = decryptStudentCode(
        c.student?.codigo_estudiante_encrypted || "",
        CONFIG.STUDENT_CODE_ENCRYPTION_KEY,
      );
    } catch (e) {
      this.logger.warn({ studentId }, "Failed to decrypt student code in getCaseById");
    }

    const latestAlert = alerts && alerts.length > 0 ? alerts[0] : null;
    const cutoffDate = latestAlert?.generated_at ?? new Date().toISOString();

    const { data: posts } = await this.supabase
      .from("post")
      .select("id, text_content, created_at")
      .eq("student_id", studentId)
      .lte("created_at", cutoffDate)
      .eq("status", "VISIBLE")
      .order("created_at", { ascending: false })
      .limit(20);

    const { data: chatRoom } = await this.supabase
      .from("chat_room")
      .select("id, status")
      .eq("case_id", caseId)
      .maybeSingle();

    const complementaryData = compData
      ? {
          nombre_completo: compData.nombre_completo,
          programa: compData.programa,
          semestre: compData.semestre,
          correo_contacto: compData.correo_contacto,
        }
      : null;

    return {
      ...c,
      anonymous_alias: pseudonymObj?.texto || null,
      avatar_url: pseudonymObj?.avatar_url || null,
      student: {
        ...c.student,
        id: studentId,
        student_code: decryptedCode,
        complementary_data: complementaryData,
      },
      complementary_data: complementaryData,
      alerts: (alerts || []).map((a: any) => ({
        id: a.id,
        risk_level: a.risk_level,
        status: a.status,
        generated_at: a.generated_at,
        is_complementary: a.is_complementary,
      })),
      post_history: (posts || []).map((p: any) => ({
        id: p.id,
        text_content: p.text_content,
        created_at: p.created_at,
      })),
      chat_room: chatRoom
        ? { id: chatRoom.id, status: chatRoom.status }
        : { id: null, status: null },
    };
  }

  async createSelfReferral(studentId: string) {
    const existing = await this.caseRepo.findByStudentId(studentId);

    const hasActiveSelfReferral = existing.some(
      (c) => c.case_type === "SELF_REFERRAL" && c.status !== "ARCHIVED" && c.status !== "RESOLVED",
    );

    if (hasActiveSelfReferral) {
      throw Errors.CONFLICT(
        "ACTIVE_SELF_REFERRAL_EXISTS",
        "Ya tienes una autoderivación activa",
      );
    }

    const caseData = await this.caseRepo.create({
      student_id: studentId,
      case_type: "SELF_REFERRAL",
      status: "OPENED",
    });

    return caseData;
  }

  async setFormalActive(caseId: string, psychologistId: string) {
    const caseData = await this.caseRepo.findById(caseId);

    if (!caseData) {
      throw Errors.NOT_FOUND("Caso clínico");
    }

    if (caseData.assigned_psychologist_id !== psychologistId) {
      throw createError(
        "FORBIDDEN",
        "No eres el psicólogo asignado a este caso",
        403,
      );
    }

    const { data: student, error: studentError } = await this.supabase
      .from("student")
      .select("caso_formal_activo")
      .eq("id", caseData.student_id)
      .maybeSingle();

    if (studentError || !student) {
      this.logger.error({ err: studentError, studentId: caseData.student_id }, "Student not found");
      throw Errors.NOT_FOUND("Estudiante");
    }

    if (student.caso_formal_activo) {
      throw Errors.CONFLICT(
        "FORMAL_ACTIVE_ALREADY_SET",
        "El caso formal activo ya está habilitado para este estudiante",
      );
    }

    const { error: updateError } = await this.supabase
      .from("student")
      .update({ caso_formal_activo: true })
      .eq("id", caseData.student_id);

    if (updateError) {
      this.logger.error({ err: updateError, studentId: caseData.student_id }, "Failed to set formal active");
      throw Errors.INTERNAL_SERVER_ERROR("Error al activar el caso formal");
    }

    await this.caseRepo.update(caseId, { status: "ASSIGNED" });

    return {
      case_id: caseId,
      student_id: caseData.student_id,
      caso_formal_activo: true,
      status: "ASSIGNED",
    };
  }

  // ── Chat ──

  async createChatRoom(caseId: string, psychologistId: string) {
    const caseData = await this.verifyCaseAccess(caseId, psychologistId, "psychologist");

    if (caseData.status !== "ASSIGNED") {
      throw Errors.BAD_REQUEST("El caso clínico debe estar en estado ASSIGNED");
    }

    const { data: existingRooms } = await this.supabase
      .from("chat_room")
      .select("id, status")
      .eq("case_id", caseId)
      .eq("status", "ACTIVE");

    if (existingRooms && existingRooms.length > 0) {
      throw Errors.CONFLICT(
        "ACTIVE_ROOM_EXISTS",
        "Ya existe una sala de chat activa para este caso",
      );
    }

    const { data: room, error } = await this.supabase
      .from("chat_room")
      .insert({
        case_id: caseId,
        psychologist_id: psychologistId,
        status: "ACTIVE",
      })
      .select("*")
      .single();

    if (error) {
      this.logger.error({ err: error, caseId }, "Failed to create chat room");
      throw Errors.INTERNAL_SERVER_ERROR("Error al crear la sala de chat");
    }

    return room;
  }

  async getCaseChat(caseId: string, userId: string, userRole: "student" | "psychologist", campus: string, query: ChatMessagesQuery) {
    await this.verifyCaseAccess(caseId, userId, userRole, campus);

    const { data: room } = await this.supabase
      .from("chat_room")
      .select("id, status, opened_at, last_activity_at")
      .eq("case_id", caseId)
      .maybeSingle();

    if (!room) {
      return { chat_id: null, status: null, messages: [], meta: { next_cursor: null } };
    }

    let msgQuery = this.supabase
      .from("chat_message")
      .select("id, chat_room_id, sender_id, sender_role, text_content, message_type, read, sent_at")
      .eq("chat_room_id", room.id)
      .order("sent_at", { ascending: false })
      .limit(query.limit);

    if (query.cursor) {
      msgQuery = msgQuery.lt("sent_at", query.cursor);
    }

    const { data: messages, error } = await msgQuery;

    if (error) {
      this.logger.error({ err: error, roomId: room.id }, "Failed to get chat messages");
      throw Errors.INTERNAL_SERVER_ERROR("Error al obtener mensajes");
    }

    const sorted = (messages || []).sort(
      (a: any, b: any) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime(),
    );

    const lastMsg = sorted[sorted.length - 1];
    const nextCursor = messages && messages.length === query.limit && lastMsg
      ? lastMsg.sent_at
      : null;

    return {
      chat_id: room.id,
      status: room.status,
      messages: sorted,
      meta: { next_cursor: nextCursor },
    };
  }

  async sendChatMessage(caseId: string, userId: string, userRole: "student" | "psychologist", campus: string, body: CreateChatMessageBody) {
    const caseData = await this.verifyCaseAccess(caseId, userId, userRole, campus);

    if (userRole === "student" && body.message_type !== "STANDARD_TEXT") {
      throw createError(
        "FORBIDDEN",
        "Los estudiantes solo pueden enviar mensajes de tipo STANDARD_TEXT",
        403,
      );
    }

    const { data: room } = await this.supabase
      .from("chat_room")
      .select("id, status")
      .eq("case_id", caseId)
      .maybeSingle();

    if (!room) {
      throw Errors.NOT_FOUND("Sala de chat");
    }

    if (room.status !== "ACTIVE") {
      throw createError("CHAT_ARCHIVED", "La sala de chat está archivada", 400);
    }

    let finalText = body.text_content;

    if (body.message_type === "CHARACTERIZATION_LINK" && userRole === "psychologist") {
      finalText = CONFIG.FO_BU_O13_FORM_URL;
    }

    const { data: message, error } = await this.supabase
      .from("chat_message")
      .insert({
        chat_room_id: room.id,
        sender_id: userId,
        sender_role: userRole === "student" ? "STUDENT" : "PSYCHOLOGIST",
        text_content: finalText,
        message_type: body.message_type,
      })
      .select("*")
      .single();

    if (error) {
      this.logger.error({ err: error, caseId }, "Failed to create chat message");
      throw Errors.INTERNAL_SERVER_ERROR("Error al enviar el mensaje");
    }

    await this.supabase
      .from("chat_room")
      .update({ last_activity_at: new Date().toISOString() })
      .eq("id", room.id);

    return message;
  }

  async archiveChatRoom(caseId: string, psychologistId: string) {
    await this.verifyCaseAccess(caseId, psychologistId, "psychologist");

    const { data: room } = await this.supabase
      .from("chat_room")
      .select("id, status")
      .eq("case_id", caseId)
      .maybeSingle();

    if (!room) {
      throw Errors.NOT_FOUND("Sala de chat");
    }

    if (room.status === "ARCHIVED") {
      throw Errors.BAD_REQUEST("La sala de chat ya está archivada");
    }

    const { data: updated, error } = await this.supabase
      .from("chat_room")
      .update({ status: "ARCHIVED", closed_at: new Date().toISOString() })
      .eq("id", room.id)
      .select("*")
      .single();

    if (error) {
      this.logger.error({ err: error, roomId: room.id }, "Failed to archive chat room");
      throw Errors.INTERNAL_SERVER_ERROR("Error al archivar la sala de chat");
    }

    return updated;
  }

  // ── Consent ──

  async createConsent(caseId: string, psychologistId: string, campus: string, documentVersion: string) {
    const caseData = await this.verifyCaseAccess(caseId, psychologistId, "psychologist", campus);

    const { data: existing } = await this.supabase
      .from("informed_consent_signature")
      .select("id")
      .eq("case_id", caseId)
      .maybeSingle();

    if (existing) {
      throw Errors.CONFLICT(
        "CONSENT_ALREADY_EXISTS",
        "Ya existe un consentimiento informado registrado para este caso",
      );
    }

    const { data: consent, error } = await this.supabase
      .from("informed_consent_signature")
      .insert({
        case_id: caseId,
        student_id: caseData.student_id,
        document_version: documentVersion,
        form_code: "FO-BU-O13",
      })
      .select("id, signed_at")
      .single();

    if (error) {
      this.logger.error({ err: error, caseId }, "Failed to create consent record");
      throw Errors.INTERNAL_SERVER_ERROR("Error al registrar el consentimiento informado");
    }

    return { consent_id: consent.id, signed_at: consent.signed_at };
  }
}
