export const riskLevelTranslation: Record<string, string> = {
  LOW: "bajo",
  MEDIUM: "medio",
  HIGH: "alto",
};

export const alertStatusTranslation: Record<string, string> = {
  PENDING: "pendiente",
  ACCEPTED: "aceptada",
  SERVED: "atendida",
  FALSE_POSITIVE: "falso_positivo",
  COMPLEMENTARY: "complementaria",
};

export const caseStatusTranslation: Record<string, string> = {
  OPENED: "abierto",
  ASSIGNED: "asignado",
  ARCHIVED: "archivado",
  RESOLVED: "resuelto",
};

export const caseTypeTranslation: Record<string, string> = {
  AUTOMATIC_ALERT: "alerta_automatica",
  SELF_REFERRAL: "autoreferencia",
};

export const postStatusTranslation: Record<string, string> = {
  VISIBLE: "visible",
  DELETED: "eliminada",
  MODERATED: "moderada",
};

export const chatStatusTranslation: Record<string, string> = {
  ACTIVE: "activo",
  CLOSED_BY_INACTIVITY: "cerrado_por_inactividad",
  ARCHIVED: "archivado",
};

export const messageTypeTranslation: Record<string, string> = {
  APPOINTMENT_PROPOSAL: "propuesta_cita",
  STANDARD_TEXT: "texto_estandar",
  CHARACTERIZATION_LINK: "enlace_caracterizacion",
};

export const accountStatusTranslation: Record<string, string> = {
  ACTIVE: "activa",
  DELETED: "eliminada",
  SUSPENDED: "suspendida",
};

export const adviserExportStatusTranslation: Record<string, string> = {
  NOT_EXPORTED: "no_exportado",
  EXPORTED_SUCCESS: "exportado_exitoso",
  FAILED: "fallido",
};

export const shiftTypeTranslation: Record<string, string> = {
  SHIFT_1: "turno1",
  SHIFT_2: "turno2",
};

export const campusTranslation: Record<string, string> = {
  CLAUSTRO_SAN_AGUSTIN: "Claustro de San Agustín",
  ZARAGOCILLA: "Campus de Zaragocilla",
  PIEDRA_BOLIVAR: "Campus de Piedra de Bolívar",
  CLAUSTRO_LA_MERCED: "Claustro de la Merced",
  CLAUSTRO_SANTO_DOMINGO: "Claustro de Santo Domingo",
  EL_CARMEN_DE_BOLIVAR: "El Carmen de Bolívar",
  MAGANGUE: "Magangué",
  SAN_JUAN_NEPOMUCENO: "San Juan Nepomuceno",
  SANTA_CRUZ_DE_MOMPOS: "Santa Cruz de Mompós",
  CERETE: "Cereté",
  LORICA: "Lorica",
};

export const moderationActionTranslation: Record<string, string> = {
  HIDE: "ocultar",
  APPROVE: "aprobar",
  FLAG: "marcar",
};

export const contentTypeTranslation: Record<string, string> = {
  POST: "publicacion",
  COMMENT: "comentario",
};
