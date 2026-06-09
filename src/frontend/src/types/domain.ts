// ============================================================
// types/domain.ts
// Contratos de datos del sistema MindBridge.
// Dos capas: entidades del dominio (modelo completo) y
// tipos de presentación (lo que el frontend realmente consume).
// ============================================================

// ------------------------------------------------------------
// ENUMERACIONES
// ------------------------------------------------------------

export type EstadoCuenta = "activa" | "suspendida" | "eliminada";
export type EstadoContenido = "visible" | "moderada" | "eliminada";
export type NivelRiesgo = "bajo" | "medio" | "alto";
export type EstadoAlerta =
  | "pendiente"
  | "aceptada"
  | "atendida"
  | "falso_positivo"
  | "complementaria";
export type EstadoChat = "activo" | "archivado" | "eliminado";
export type TipoMensaje = "texto" | "propuesta_cita" | "recurso_bienestar";
export type FormatoExportacion = "PDF" | "XML";
export type EstadoEnvio = "enviado" | "fallido";
export type Turno = "turno1" | "turno2"; // turno1: 07-15h, turno2: 15-22h
export type RolUsuario = "estudiante" | "psicologo";

// ------------------------------------------------------------
// ENTIDADES DEL DOMINIO
// Representan la estructura completa de cada objeto del sistema.
// Se usan para tipar respuestas del backend y lógica interna.
// ------------------------------------------------------------

export interface Estudiante {
  id: string;
  codigoEstudiantilEncriptado: string;
  sede: string;
  seudonimoActivo: string;
  estado: EstadoCuenta;
  casoFormalActivo: boolean;
  // Opcionales: solo disponibles si el estudiante los proporcionó voluntariamente
  nombreCompleto?: string;
  programa?: string;
  semestre?: number;
  correoContacto?: string;
}

export interface Seudónimo {
  id: string;
  texto: string;
  estado: "activo" | "historico";
  fechaAsignacion: string; // ISO 8601
  fechaBaja?: string;
  estudianteId: string;
}

export interface Publicacion {
  id: string;
  estudianteId: string;
  pseudonym: string; // seudónimo activo al momento de publicar
  texto: string;
  fechaHora: string;
  estado: EstadoContenido;
  analisisNLPId?: string;
  comentariosCount: number;
}

export interface Comentario {
  id: string;
  estudianteId: string;
  pseudonym: string;
  publicacionRaizId: string;
  comentarioCitadoId?: string;
  texto: string;
  fechaHora: string;
  estado: EstadoContenido;
  analisisNLPId?: string;
}

export interface AnalisisNLP {
  id: string;
  contenidoId: string; // Publicacion.id o Comentario.id
  tipoContenido: "publicacion" | "comentario";
  pDepresion: number; // 0–100
  pAnsiedad: number; // 0–100
  pSuicida: number; // 0–100
  overrideSuicida: boolean;
  imb: number; // 0–100 = 0.6*pDepresion + 0.4*pAnsiedad
  nivelRiesgo: NivelRiesgo;
  cumpleNormas: boolean;
  timestampAnalisis: string;
}

export interface Alerta {
  id: string;
  analisisNLPId: string;
  estudianteId: string;
  pseudonym: string;
  nivelRiesgo: NivelRiesgo;
  estado: EstadoAlerta;
  esComplementaria: boolean;
  triggerTexto: string;
  sede: string;
  fechaGeneracion: string;
  fechaAceptacion?: string;
  psicologoId?: string;
}

export interface Psicologo {
  id: string;
  nombre: string;
  correoInstitucional: string;
  sede: string;
  turno: Turno;
  estado: "activa" | "inactiva";
  participacionForoHabilitada: boolean;
}

export interface Chat {
  id: string;
  alertaId: string;
  psicologoId: string;
  estudianteId: string;
  estado: EstadoChat;
  fechaApertura: string;
  fechaUltimoMensaje?: string;
  fechaCierre?: string;
}

export interface MensajeChat {
  id: string;
  chatId: string;
  remitente: "estudiante" | "psicologo";
  texto: string;
  tipo: TipoMensaje;
  fechaHora: string;
  leido: boolean;
}

export interface ConsentimientoRegistro {
  id: string;
  estudianteId: string;
  seudonimoEnAceptacion: string;
  versionDocumento: string;
  timestampAceptacion: string;
  mecanismo: "checkbox_interno" | "google_forms";
}

export interface ExportacionCaso {
  id: string;
  alertaId: string;
  psicologoId: string;
  formato: FormatoExportacion;
  estadoEnvio: EstadoEnvio;
  fechaExportacion: string;
  correoDestinatario: string;
  camposComplementariosIncluidos: string[];
}

// ------------------------------------------------------------
// TIPOS DE PRESENTACIÓN
// Subconjuntos de las entidades, adaptados a lo que cada
// vista del frontend necesita renderizar. Son el contrato
// de la API expresado desde el punto de vista del cliente.
// ------------------------------------------------------------

/** Feed del foro: lista de publicaciones */
export interface PostSummary {
  id: string;
  pseudonym: string;
  text: string;
  createdAt: string;
  status: EstadoContenido;
  commentCount: number;
  avatarUrl?: string;
}

/** Detalle de publicación con su hilo de comentarios */
export interface PostDetail extends PostSummary {
  comments: CommentItem[];
}

export interface CommentItem {
  id: string;
  pseudonym: string;
  text: string;
  createdAt: string;
  status: EstadoContenido;
  citedCommentId?: string;
  avatarUrl?: string;
}

/** Panel del psicólogo: resumen de alerta sin datos identificativos.
 *  Visible para todos los psicólogos de la sede antes de la aceptación. */
export interface AlertSummary {
  id: string;
  pseudonym: string;
  riskLevel: NivelRiesgo;
  status: EstadoAlerta;
  triggerText: string;
  createdAt: string;
  isComplementary: boolean;
  sede: string;
}

/** Detalle de alerta: disponible solo tras la aceptación formal del caso.
 *  Incluye identidad del estudiante y puntuaciones del NLP. */
export interface AlertDetail extends AlertSummary {
  studentIdentity: {
    studentCode: string; // código desencriptado, visible solo para el psicólogo que aceptó
    sede: string;
    nombreCompleto?: string;
    programa?: string;
    semestre?: number;
    correoContacto?: string;
  };
  scores: {
    depression: number; // pDepresion 0–100
    anxiety: number; // pAnsiedad  0–100
    suicidal: number; // pSuicida   0–100
    imb: number; // índice compuesto 0–100
    suicidalOverride: boolean;
  };
  previousAlerts: AlertSummary[];
}

/** Maps backend sender_role (UPPER_SNAKE_CASE) to ChatMessageItem sender */
export function mapSenderRole(role: string): "student" | "psychologist" {
  return role.toLowerCase() as "student" | "psychologist";
}

/** Mensaje individual dentro de un chat */
export interface ChatMessageItem {
  id: string;
  sender: "student" | "psychologist";
  text: string;
  type: TipoMensaje;
  sentAt: string;
  read: boolean;
}

/** Perfil del estudiante para la vista /perfil */
export interface StudentProfile {
  pseudonym: string;
  sede: string;
  memberSince: string;
  postCount: number;
  recentPosts: PostSummary[];
}
