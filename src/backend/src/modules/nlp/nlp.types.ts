export interface NLPRequest {
  id_publicacion: string;
  id_seudonimo: string;
  texto: string;
  timestamp: string;
  contexto_previo?: Array<{
    texto_resumido: string;
    timestamp: string;
    nivel_riesgo_previo: string | null;
  }>;
  incluir_explicabilidad: boolean;
}

export interface NLPClinicalSection {
  p_depresion: number;
  p_ansiedad: number;
  p_suicida: number;
  imb: number;
  suicidal_override: boolean;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "SAFETY_FILTER_TRIGGERED";
  top_clinical_label: string | null;
  rationale: string | null;
}

export interface NLPCommunitySection {
  cumple_normas: boolean;
  score_normas: number;
  moderation_decision: "APPROVED" | "REJECTED";
}

export interface NLPResponse {
  id_publicacion: string;
  status: "success" | "error";
  timestamp_analisis: string;
  execution_time_ms: number;
  texto_suficiente: boolean;
  safety_filter_triggered: boolean;
  confianza_reducida: boolean;
  advertencias: string[];
  clinical: NLPClinicalSection | null;
  community: NLPCommunitySection | null;
  metadatos: {
    tokens_procesados: number;
    publicaciones_contexto_usadas: number;
    version_modelo_clinico: string;
    version_modelo_normas: string;
  };
}
