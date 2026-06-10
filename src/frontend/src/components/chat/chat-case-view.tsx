"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "../../lib/api";
import { supabase } from "../../lib/supabase";
import { RiskBadge } from "../forum/risk-badge";
import { NlpScoresPanel } from "../alerts/nlp-scores-panel";
import { ChatBubble } from "./chat-bubble";
import { PsychologistChatInput } from "./psychologist-chat-input";
import { riskLevelTranslation } from "../../lib/i18n/risk";
import type { NivelRiesgo, ChatMessageItem as DomainChatMessage } from "../../types/domain";
import { ChevronLeft, MessageSquare, X } from "lucide-react";

interface CaseDetail {
  id: string;
  anonymous_alias: string | null;
  avatar_url: string | null;
  status: string;
  case_type: string;
  student: {
    id: string;
    codigo_estudiante_encrypted?: string;
    campus?: string;
  } | null;
  nlp_detail?: {
    depressive_probability: number | null;
    anxiety_probability: number | null;
    suicidal_probability: number | null;
    base_malaise_index: number | null;
    suicidal_override: boolean;
    risk_level: string;
    analyzed_at: string;
  } | null;
  complementary_data?: {
    nombre_completo: string | null;
    programa: string | null;
    semestre: number | null;
    correo_contacto: string | null;
  } | null;
}

interface ChatCaseViewProps {
  caseId: string;
  token: string;
}

function mapSenderRole(role: string): "student" | "psychologist" {
  return role.toLowerCase() as "student" | "psychologist";
}

let tempIdCounter = 0;
function nextTempId(): string {
  tempIdCounter += 1;
  return `temp_${Date.now()}_${tempIdCounter}`;
}

export function ChatCaseView({ caseId, token }: ChatCaseViewProps) {
  const router = useRouter();
  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null);
  const [messages, setMessages] = useState<DomainChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function init() {
      setLoading(true);

      try {
        const detail = await apiGet<CaseDetail>(`/cases/${caseId}`, token);
        if (!cancelled) setCaseDetail(detail);
      } catch {
        // case info failed silently
      }

      try {
        const msgs = await apiGet<any[]>(`/cases/${caseId}/chat`, token);
        if (!cancelled) {
          const raw = Array.isArray(msgs) ? msgs : [];
          const mapped: DomainChatMessage[] = raw.map((m: any) => ({
            id: m.id,
            sender: mapSenderRole(m.sender_role || "psychologist"),
            text: m.text_content || m.text || "",
            type: m.message_type === "APPOINTMENT_PROPOSAL" ? "propuesta_cita"
              : m.message_type === "CHARACTERIZATION_LINK" ? "recurso_bienestar"
              : "texto",
            sentAt: m.sent_at || m.created_at || new Date().toISOString(),
            read: m.read ?? false,
          }));
          setMessages(mapped);
        }
      } catch {
        if (!cancelled) setMessages([]);
      } finally {
        if (!cancelled) setLoading(false);
      }

      channel = supabase.channel(`case:${caseId}:messages`, {
        config: { private: true },
      });

      channel.on("broadcast", { event: "INSERT" }, (payload) => {
        const record = payload.payload ?? payload;
        setMessages((prev) => {
          if (prev.some((m) => m.id === record.id)) return prev;
          const newMessage: DomainChatMessage = {
            id: record.id,
            sender: mapSenderRole(record.sender_role || "psychologist"),
            text: record.text_content || record.text || "",
            type: record.message_type === "APPOINTMENT_PROPOSAL" ? "propuesta_cita"
              : record.message_type === "CHARACTERIZATION_LINK" ? "recurso_bienestar"
              : "texto",
            sentAt: record.sent_at || record.created_at || record.sentAt || new Date().toISOString(),
            read: record.read ?? false,
          };
          return [...prev, newMessage];
        });
      });

      channel.subscribe();
    }

    init();

    return () => {
      cancelled = true;
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
    };
  }, [caseId, token]);

  async function handleSend(text: string, messageType: string) {
    const tempId = nextTempId();
    const optimistic: DomainChatMessage = {
      id: tempId,
      sender: "psychologist",
      text,
      type: messageType === "APPOINTMENT_PROPOSAL" ? "propuesta_cita"
        : messageType === "CHARACTERIZATION_LINK" ? "recurso_bienestar"
        : "texto",
      sentAt: new Date().toISOString(),
      read: true,
    };

    setMessages((prev) => [...prev, optimistic]);
    setSending(true);

    try {
      const result = await apiPost<any>(
        `/cases/${caseId}/chat/messages`,
        { text_content: text, message_type: messageType },
        token,
      );
      if (result?.id) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, id: result.id } : m))
        );
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  }

  const level = caseDetail?.nlp_detail
    ? (riskLevelTranslation[caseDetail.nlp_detail.risk_level] as NivelRiesgo | undefined)
    : undefined;

  const studentName =
    caseDetail?.complementary_data?.nombre_completo ||
    caseDetail?.anonymous_alias ||
    `Caso #${caseId.slice(0, 8)}`;

  const studentAvatarUrl = caseDetail?.avatar_url || undefined;

  return (
    <div className="flex h-[calc(100vh-6rem)] gap-4">
      <div className={`flex flex-col gap-4 overflow-y-auto custom-scrollbar transition-all duration-300 ${chatCollapsed ? "flex-1" : "w-1/2 lg:w-[45%]"}`}>
        <button
          onClick={() => router.push("/cases")}
          className="self-start flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors"
        >
          <ChevronLeft size={14} />
          Volver a casos
        </button>

        <div className="bg-surface border border-border rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold font-display text-foreground">
              {caseDetail?.anonymous_alias || studentName}
            </h2>
            {level && <RiskBadge level={level} />}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted">Estado</span>
              <p className="text-foreground font-medium">
                {caseDetail?.status === "ASSIGNED" ? "Asignado"
                  : caseDetail?.status === "ACCEPTED" ? "Aceptado"
                  : caseDetail?.status || "—"}
              </p>
            </div>
            <div>
              <span className="text-muted">Tipo</span>
              <p className="text-foreground font-medium">
                {caseDetail?.case_type === "AUTOMATIC_ALERT" ? "Alerta automática"
                  : caseDetail?.case_type === "SELF_REFERRAL" ? "Autoderivación"
                  : "—"}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-4 space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Estudiante</h3>
          {caseDetail?.complementary_data?.nombre_completo ? (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted">Nombre</span>
                <p className="text-foreground font-medium">{caseDetail.complementary_data.nombre_completo}</p>
              </div>
              <div>
                <span className="text-muted">Programa</span>
                <p className="text-foreground font-medium">{caseDetail.complementary_data.programa || "—"}</p>
              </div>
              <div>
                <span className="text-muted">Semestre</span>
                <p className="text-foreground font-medium">{caseDetail.complementary_data.semestre != null ? String(caseDetail.complementary_data.semestre) : "—"}</p>
              </div>
              <div>
                <span className="text-muted">Correo</span>
                <p className="text-foreground font-medium">{caseDetail.complementary_data.correo_contacto || "—"}</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted">Datos complementarios no disponibles</p>
          )}
        </div>

        {caseDetail?.nlp_detail && (
          <NlpScoresPanel
            depressive_probability={caseDetail.nlp_detail.depressive_probability}
            anxiety_probability={caseDetail.nlp_detail.anxiety_probability}
            suicidal_probability={caseDetail.nlp_detail.suicidal_probability}
            base_malaise_index={caseDetail.nlp_detail.base_malaise_index}
            suicidal_override={caseDetail.nlp_detail.suicidal_override}
            risk_level={caseDetail.nlp_detail.risk_level}
            analyzed_at={caseDetail.nlp_detail.analyzed_at}
          />
        )}

        <div className="bg-surface border border-border rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">Acciones</h3>
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1.5 rounded-xl text-xs font-medium bg-muted text-muted opacity-50 cursor-not-allowed">
              Marcar atendido
            </span>
            <span className="px-3 py-1.5 rounded-xl text-xs font-medium bg-muted text-muted opacity-50 cursor-not-allowed">
              Falso positivo
            </span>
            <span className="px-3 py-1.5 rounded-xl text-xs font-medium bg-muted text-muted opacity-50 cursor-not-allowed">
              Exportar PDF
            </span>
          </div>
        </div>
      </div>

      <div className={`flex flex-col bg-surface border border-border rounded-2xl overflow-hidden transition-all duration-300 ${chatCollapsed ? "w-0 border-0 ml-0 overflow-hidden" : "flex-1 lg:w-[55%]"}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-muted" />
            <h3 className="text-sm font-semibold text-foreground">
              Chat clínico
            </h3>
          </div>
          <button
            onClick={() => setChatCollapsed(true)}
            className="p-1 rounded-lg hover:bg-surface text-muted hover:text-foreground transition-colors"
            aria-label="Colapsar chat"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-xs text-muted">Cargando mensajes…</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-xs text-muted">No hay mensajes aún. Escribe algo para empezar.</p>
            </div>
          ) : (
            messages.map((msg) => (
              <ChatBubble
                key={msg.id}
                message={msg}
                isOwn={msg.sender === "psychologist"}
                avatarUrl={!msg.sender || msg.sender === "student" ? studentAvatarUrl : undefined}
              />
            ))
          )}
          {sending && (
            <div className="flex justify-end">
              <div className="rounded-2xl px-3 py-2 max-w-[80%] bg-primary/60 text-white text-sm">
                <span className="animate-pulse">Enviando…</span>
              </div>
            </div>
          )}
        </div>

        <PsychologistChatInput onSend={handleSend} />
      </div>

      {chatCollapsed && (
        <button
          onClick={() => setChatCollapsed(false)}
          className="fixed bottom-4 right-4 z-40 w-12 h-12 rounded-full bg-primary text-white shadow-lg flex items-center justify-center hover:bg-primary/90 transition-all"
          aria-label="Abrir chat"
        >
          <MessageSquare size={22} />
        </button>
      )}
    </div>
  );
}
