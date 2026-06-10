import { FastifyBaseLogger } from "fastify";
import { SupabaseClient } from "@supabase/supabase-js";
import { IAlertRepository } from "../../repositories/interfaces.js";
import { ICaseRepository } from "../../repositories/interfaces.js";
import { Errors, createError } from "../../lib/errors.js";
import { CONFIG } from "../../config.js";
import { decryptStudentCode } from "../../lib/encryption.js";
import type { UdecCampus, RiskLevel } from "../../types/domain.js";

interface AlertListItem {
  id: string;
  risk_level: RiskLevel;
  status: string;
  generated_at: string;
  campus: UdecCampus;
  is_complementary: boolean;
  ai_generated_summary: string | null;
  assigned_psychologist_id: string | null;
  pseudonym: string;
}

interface DeanonymizedData {
  student_code: string;
  nombre_completo: string | null;
  programa: string | null;
  semestre: number | null;
  correo_contacto: string | null;
}

interface NlpDetail {
  id: string;
  depressive_probability: number | null;
  anxiety_probability: number | null;
  suicidal_probability: number | null;
  base_malaise_index: number | null;
  suicidal_override: boolean;
  risk_level: RiskLevel;
  analyzed_at: string;
}

interface PostHistoryItem {
  id: string;
  text_content: string;
  created_at: string;
}

export class AlertsService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly logger: FastifyBaseLogger,
    private readonly alertRepo: IAlertRepository,
    private readonly caseRepo: ICaseRepository,
  ) {}

  async listAlerts(campus: UdecCampus, query?: { status?: string }): Promise<AlertListItem[]> {
    let dbQuery = this.supabase
      .from("alert")
      .select(`
        id,
        risk_level,
        status,
        generated_at,
        campus,
        is_complementary,
        ai_generated_summary,
        assigned_psychologist_id,
        student:student_id (
          active_pseudonym_id,
          pseudonym:student_active_pseudonym_id_fkey (
            texto
          )
        )
      `)
      .eq("campus", campus);

    if (query?.status) {
      dbQuery = dbQuery.eq("status", query.status);
    }

    dbQuery = dbQuery.order("risk_level", { ascending: true })
      .order("generated_at", { ascending: false });

    const { data, error } = await dbQuery;

    if (error) {
      this.logger.error({ err: error, campus }, "Failed to list alerts");
      throw Errors.INTERNAL_SERVER_ERROR("Error al obtener alertas");
    }

    return ((data || []) as any[]).map((item) => ({
      id: item.id,
      risk_level: item.risk_level,
      status: item.status,
      generated_at: item.generated_at,
      campus: item.campus,
      is_complementary: item.is_complementary,
      ai_generated_summary: item.ai_generated_summary,
      assigned_psychologist_id: item.assigned_psychologist_id,
      pseudonym: item.student?.pseudonym?.texto || "Anónimo",
    }));
  }

  async getAlertDetail(alertId: string, psychologistId: string, campus: UdecCampus) {
    const alert = await this.alertRepo.findById(alertId);

    if (!alert) {
      throw Errors.NOT_FOUND("Alerta");
    }

    if (alert.campus !== campus) {
      throw Errors.FORBIDDEN("No tienes acceso a alertas de otra sede");
    }

    const isOwner = alert.assigned_psychologist_id === psychologistId;

    if (!isOwner && alert.status !== "PENDING") {
      throw createError("ALERT_ASSIGNED_TO_ANOTHER", "Esta alerta ya fue aceptada por otro psicólogo", 403);
    }

    const { data: studentData } = await this.supabase
      .from("student")
      .select(`
        id,
        codigo_estudiante_encrypted,
        campus,
        status,
        active_pseudonym_id,
        pseudonym:student_active_pseudonym_id_fkey (
          texto,
          avatar_url
        )
      `)
      .eq("id", alert.student_id)
      .maybeSingle();

    const pseudonymText = (studentData as any)?.pseudonym?.texto || "Anónimo";
    const avatarUrl = (studentData as any)?.pseudonym?.avatar_url || null;

    let deanonymizedData: DeanonymizedData | null = null;
    let postHistory: PostHistoryItem[] = [];
    let nlpDetail: NlpDetail | null = null;

    if (isOwner && alert.status !== "PENDING") {
      const { data: compData } = await this.supabase
        .from("complementary_data")
        .select("nombre_completo, programa, semestre, correo_contacto")
        .eq("student_id", alert.student_id)
        .maybeSingle();

      let studentCode = "";
      try {
        studentCode = decryptStudentCode(
          studentData?.codigo_estudiante_encrypted || "",
          CONFIG.STUDENT_CODE_ENCRYPTION_KEY
        );
      } catch (e) {
        this.logger.warn({ studentId: alert.student_id }, "Failed to decrypt student code for detail");
      }

      deanonymizedData = {
        student_code: studentCode,
        nombre_completo: (compData as any)?.nombre_completo || null,
        programa: (compData as any)?.programa || null,
        semestre: (compData as any)?.semestre || null,
        correo_contacto: (compData as any)?.correo_contacto || null,
      };

      const { data: posts } = await this.supabase
        .from("post")
        .select("id, text_content, created_at")
        .eq("student_id", alert.student_id)
        .neq("status", "DELETED")
        .order("created_at", { ascending: false })
        .limit(10);

      postHistory = (posts || []).map((p: any) => ({
        id: p.id,
        text_content: p.text_content,
        created_at: p.created_at,
      }));

      const { data: nlpData } = await this.supabase
        .from("nlp_analysis")
        .select("*")
        .eq("id", alert.nlp_analysis_id)
        .maybeSingle();

      if (nlpData) {
        nlpDetail = {
          id: nlpData.id,
          depressive_probability: nlpData.depressive_probability,
          anxiety_probability: nlpData.anxiety_probability,
          suicidal_probability: nlpData.suicidal_probability,
          base_malaise_index: nlpData.base_malaise_index,
          suicidal_override: nlpData.suicidal_override,
          risk_level: nlpData.risk_level,
          analyzed_at: nlpData.analyzed_at,
        };
      }
    }

    return {
      id: alert.id,
      risk_level: alert.risk_level,
      status: alert.status,
      generated_at: alert.generated_at,
      campus: alert.campus,
      is_complementary: alert.is_complementary,
      ai_generated_summary: alert.ai_generated_summary,
      pseudonym: pseudonymText,
      avatar_url: avatarUrl,
      deanonymized_data: deanonymizedData,
      post_history: postHistory,
      nlp_detail: nlpDetail,
    };
  }

  async acceptAlert(alertId: string, psychologistId: string, campus: UdecCampus) {
    const alert = await this.alertRepo.findById(alertId);

    if (!alert) {
      throw Errors.NOT_FOUND("Alerta");
    }

    if (alert.campus !== campus) {
      throw Errors.FORBIDDEN("No puedes aceptar alertas de otra sede");
    }

    if (alert.status !== "PENDING") {
      throw Errors.CONFLICT(
        "ALERT_ALREADY_ACCEPTED",
        "Esta alerta ya fue aceptada por otro psicólogo"
      );
    }

    const { data: updatedAlert, error: updateError } = await this.supabase
      .from("alert")
      .update({
        status: "ACCEPTED",
        assigned_psychologist_id: psychologistId,
        accepted_at: new Date().toISOString(),
      })
      .eq("id", alertId)
      .eq("status", "PENDING")
      .select("*")
      .maybeSingle();

    if (updateError || !updatedAlert) {
      const recheck = await this.alertRepo.findById(alertId);
      if (recheck && recheck.status !== "PENDING") {
        throw Errors.CONFLICT(
          "ALERT_ALREADY_ACCEPTED",
          "Esta alerta ya fue aceptada por otro psicólogo"
        );
      }
      throw Errors.INTERNAL_SERVER_ERROR("Error al aceptar la alerta");
    }

    // Buscar caso activo existente del estudiante (OPENED o ASSIGNED)
    const { data: existingCase } = await this.supabase
      .from("clinical_case")
      .select("*")
      .eq("student_id", alert.student_id)
      .in("status", ["OPENED", "ASSIGNED"])
      .order("opened_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let caseData: any;
    let isComplementary = false;

    if (existingCase) {
      // Reutilizar caso existente — esta alerta es complementaria
      caseData = existingCase;
      isComplementary = true;
    } else {
      // Crear caso nuevo
      const { data: newCase, error: caseError } = await this.supabase
        .from("clinical_case")
        .insert({
          student_id: alert.student_id,
          case_type: "AUTOMATIC_ALERT",
          status: "ASSIGNED",
          assigned_psychologist_id: psychologistId,
        })
        .select("*")
        .maybeSingle();

      if (caseError || !newCase) {
        this.logger.error({ err: caseError, alertId }, "Failed to create clinical case");
        // Revertir el estado de la alerta para mantener consistencia
        await this.supabase
          .from("alert")
          .update({ status: "PENDING", assigned_psychologist_id: null, accepted_at: null })
          .eq("id", alertId);
        throw Errors.INTERNAL_SERVER_ERROR("Error al crear el caso clínico");
      }
      caseData = newCase;
    }

    // Vincular alerta al caso y marcar como complementaria si aplica
    const { error: linkError } = await this.supabase
      .from("alert")
      .update({
        case_id: caseData.id,
        is_complementary: isComplementary,
      })
      .eq("id", alertId);

    if (linkError) {
      this.logger.error({ err: linkError, alertId }, "Failed to link alert to case");
    }

    const { data: studentData } = await this.supabase
      .from("student")
      .select("codigo_estudiante_encrypted")
      .eq("id", alert.student_id)
      .maybeSingle();

    let decryptedCode = "";
    try {
      decryptedCode = decryptStudentCode(
        studentData?.codigo_estudiante_encrypted || "",
        CONFIG.STUDENT_CODE_ENCRYPTION_KEY
      );
    } catch (e) {
      this.logger.warn({ studentId: alert.student_id }, "Failed to decrypt student code on accept");
    }

    return {
      alert: updatedAlert,
      clinical_case: caseData,
      deanonymized_student_code: decryptedCode,
    };
  }

  async updateAlertStatus(alertId: string, psychologistId: string, status: "SERVED" | "FALSE_POSITIVE") {
    const alert = await this.alertRepo.findById(alertId);

    if (!alert) {
      throw Errors.NOT_FOUND("Alerta");
    }

    if (alert.assigned_psychologist_id !== psychologistId) {
      throw Errors.FORBIDDEN("No eres el psicólogo asignado a esta alerta");
    }

    const updated = await this.alertRepo.updateStatus(alertId, status);

    return { alert: updated };
  }
}
