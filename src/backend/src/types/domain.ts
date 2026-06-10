// ──────────────────────────────────────────────────────────
// Domain types matching DB schema (schema_mindbridge_v1.1)
// ──────────────────────────────────────────────────────────

export type UdecCampus =
  | "CLAUSTRO_SAN_AGUSTIN"
  | "ZARAGOCILLA"
  | "PIEDRA_BOLIVAR"
  | "CLAUSTRO_LA_MERCED"
  | "CLAUSTRO_SANTO_DOMINGO"
  | "EL_CARMEN_DE_BOLIVAR"
  | "MAGANGUE"
  | "SAN_JUAN_NEPOMUCENO"
  | "SANTA_CRUZ_DE_MOMPOS"
  | "CERETE"
  | "LORICA";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export type AlertStatus =
  | "PENDING"
  | "ACCEPTED"
  | "SERVED"
  | "FALSE_POSITIVE"
  | "COMPLEMENTARY";

export type CaseStatus = "OPENED" | "ASSIGNED" | "ARCHIVED" | "RESOLVED";

export type CaseType = "AUTOMATIC_ALERT" | "SELF_REFERRAL";

export type ContentStatus = "VISIBLE" | "MODERATED" | "DELETED";

export type ChatStatus = "ACTIVE" | "CLOSED_BY_INACTIVITY" | "ARCHIVED";

export type MessageType = "STANDARD_TEXT" | "APPOINTMENT_PROPOSAL" | "CHARACTERIZATION_LINK";

export type AccountStatus = "ACTIVE" | "SUSPENDED" | "DELETED";

export type ShiftType = "SHIFT_1" | "SHIFT_2";

export type UserRole = "student" | "psychologist";

export interface JwtPayload {
  sub: string;
  role: UserRole;
  campus: UdecCampus;
  iat: number;
  exp: number;
}

export interface AuthenticatedUser {
  sub: string;
  role: UserRole;
  campus: UdecCampus;
}

export interface Student {
  id: string;
  codigo_estudiante_encrypted: string;
  campus: UdecCampus;
  status: AccountStatus;
  active_pseudonym_id: string | null;
  caso_formal_activo: boolean;
  rol_id: string;
  created_at: string;
  updated_at: string;
}

export interface Psychologist {
  id: string;
  nombre: string;
  correo_institucional: string;
  campus: UdecCampus;
  shift: ShiftType;
  status: AccountStatus;
  participacion_foro_habilitada: boolean;
  email_alerts_subscribed: boolean;
  pseudonimo_institucional: string;
  rol_id: string;
  created_at: string;
  updated_at: string;
}

export interface Pseudonym {
  id: string;
  student_id: string;
  texto: string;
  avatar_url: string | null;
  status: "ACTIVE" | "HISTORICAL";
  assigned_at: string;
  deactivated_at: string | null;
}

export interface RegistrationConsent {
  id: string;
  student_id: string;
  pseudonym_at_acceptance: string;
  document_version: string;
  mechanism: string;
  accepted_at: string;
}

export interface Rol {
  id: string;
  nombre: string;
  descripcion: string | null;
}

// ── Alert ──

export interface Alert {
  id: string;
  case_id: string;
  nlp_analysis_id: string;
  student_id: string;
  campus: UdecCampus;
  risk_level: RiskLevel;
  status: AlertStatus;
  assigned_psychologist_id: string | null;
  is_complementary: boolean;
  ai_generated_summary: string | null;
  historical_snapshot: Record<string, unknown> | null;
  generated_at: string;
  accepted_at: string | null;
  closed_at: string | null;
}

// ── Clinical Case ──

export interface ClinicalCase {
  id: string;
  student_id: string;
  case_type: CaseType;
  status: CaseStatus;
  assigned_psychologist_id: string | null;
  is_unsubscribed_from_recapture: boolean;
  adviser_export_status: "NOT_EXPORTED" | "EXPORTED_SUCCESS" | "FAILED";
  opened_at: string;
  updated_at: string;
}

// ── Chat ──

export interface ChatRoom {
  id: string;
  case_id: string;
  psychologist_id: string;
  status: ChatStatus;
  opened_at: string;
  last_activity_at: string;
  closed_at: string | null;
}

export interface ChatMessage {
  id: string;
  chat_room_id: string;
  sender_id: string;
  sender_role: "STUDENT" | "PSYCHOLOGIST";
  text_content: string;
  message_type: MessageType;
  read: boolean;
  sent_at: string;
}

// ── NLP ──

export interface NlpAnalysis {
  id: string;
  post_id: string | null;
  comment_id: string | null;
  content_type: "POST" | "COMMENT";
  analyzed_text_snapshot: string;
  depressive_probability: number | null;
  anxiety_probability: number | null;
  suicidal_probability: number | null;
  base_malaise_index: number | null;
  suicidal_override: boolean;
  community_rules_infraction: boolean;
  top_clinical_label: string | null;
  risk_level: RiskLevel;
  analyzed_at: string;
}
