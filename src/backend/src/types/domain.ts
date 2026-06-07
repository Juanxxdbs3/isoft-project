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
