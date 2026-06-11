"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, AlertCircle, MessageSquare } from "lucide-react";
import { ChatBubble } from "../chat/chat-bubble";
import { ChatInput } from "../chat/chat-input";
import { supabase } from "../../lib/supabase";
import { apiPost, apiGet } from "../../lib/api";
import type { ChatMessageItem as DomainChatMessage } from "../../types/domain";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StudentChatShellProps {
  caseId: string;
  token: string;
  studentName: string;
  studentAvatarUrl?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const AVATAR_BASE =
  process.env.NEXT_PUBLIC_AVATAR_BASE_URL || "https://api.dicebear.com/10.x";
const PSYCHOLOGIST_NAME = "Equipo de Bienestar Universitario";

function mapMessage(msg: any): DomainChatMessage {
  return {
    id: msg.id,
    sender: msg.sender_role === "PSYCHOLOGIST" ? "psychologist" : "student",
    text: msg.text_content,
    type:
      msg.message_type === "APPOINTMENT_PROPOSAL"
        ? "propuesta_cita"
        : msg.message_type === "CHARACTERIZATION_LINK"
          ? "recurso_bienestar"
          : "texto",
    sentAt: msg.sent_at,
    read: msg.read ?? true,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StudentChatShell({
  caseId,
  token,
  studentName,
  studentAvatarUrl,
}: StudentChatShellProps) {
  const [messages, setMessages] = useState<DomainChatMessage[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noRoom, setNoRoom] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Inject JWT into Supabase Realtime client ──
  useEffect(() => {
    if (!token) return;
    supabase.realtime.setAuth(token);
  }, [token]);

  // ── Decode JWT to extract userId for deduplication ──
  useEffect(() => {
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setUserId(payload.sub || null);
    } catch {
      setUserId(null);
    }
  }, [token]);

  // ── Fetch chat room and messages on mount ──
  useEffect(() => {
    if (!caseId || !token) return;

    setLoading(true);
    setError(null);
    setNoRoom(false);

    apiGet<{
      chat_id: string | null;
      status: string | null;
      messages: any[];
    }>(`/cases/${caseId}/chat`, token)
      .then((data) => {
        if (!data.chat_id) {
          // Students cannot create rooms — if the psychologist hasn't started
          // the conversation yet, show a placeholder.
          setNoRoom(true);
          setLoading(false);
          return;
        }
        setRoomId(data.chat_id);
        setMessages((data.messages || []).map(mapMessage));
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Error al cargar el chat");
        setLoading(false);
      });
  }, [caseId, token]);

  // ── Subscribe to Realtime broadcast for new messages ──
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`room:${roomId}:messages`, {
        config: { private: true },
      })
      .on("broadcast", { event: "INSERT" }, (payload) => {
        const msgData = payload.payload || (payload as any).record || payload;

        if (!msgData || !msgData.id) return;

        // Skip own messages (already added optimistically via handleSend)
        if (userId && msgData.sender_id === userId) return;

        setMessages((prev) => {
          if (prev.some((m) => m.id === msgData.id || m.id === `temp_${msgData.id}`))
            return prev;
          return [...prev, mapMessage(msgData)];
        });
      });

    channel.subscribe((status) => {
      console.log(
        `[StudentChatShell] Realtime subscribe status for room ${roomId}: ${status}`,
      );
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, userId]);

  // ── Auto-scroll on new messages ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send a message (optimistic with error rollback) ──
  const handleSend = useCallback(
    (text: string) => {
      if (!roomId) return;

      const tempId = `temp_${Date.now()}`;
      const optimisticMsg: DomainChatMessage = {
        id: tempId,
        sender: "student",
        text,
        type: "texto",
        sentAt: new Date().toISOString(),
        read: true,
      };

      setMessages((prev) => [...prev, optimisticMsg]);

      apiPost<{
        id: string;
        sender_role: string;
        text_content: string;
        sent_at: string;
      }>(
        `/cases/${caseId}/chat/messages`,
        { text_content: text, message_type: "STANDARD_TEXT" },
        token,
      )
        .then((realMsg) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? mapMessage(realMsg) : m)),
          );
        })
        .catch(() => {
          // Roll back optimistic message on error
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
        });
    },
    [caseId, roomId, token],
  );

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-surface border-2 border-border rounded-2xl">
        <Loader2 size={20} className="text-muted animate-spin mb-2" />
        <p className="text-xs text-muted">Cargando conversación…</p>
      </div>
    );
  }

  // ── No room state (psychologist hasn't started the chat yet) ──
  if (noRoom) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-surface border-2 border-border rounded-2xl p-8 text-center">
        <MessageSquare size={32} className="text-muted mb-3" />
        <h3 className="text-sm font-semibold text-foreground mb-1">
          Chat no disponible
        </h3>
        <p className="text-xs text-muted max-w-xs">
          El psicólogo aún no ha iniciado la conversación. Cuando lo haga,
          podrás ver y enviar mensajes aquí.
        </p>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-surface border-2 border-border rounded-2xl">
        <AlertCircle size={20} className="text-destructive mb-2" />
        <p className="text-xs text-muted">{error}</p>
      </div>
    );
  }

  // ── Normal render ──
  return (
    <div className="flex flex-col h-[calc(100dvh-10rem)] border-2 border-border rounded-2xl overflow-hidden bg-surface shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-surface border-b border-border shrink-0">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <MessageSquare size={16} className="text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            {PSYCHOLOGIST_NAME}
          </h2>
          <span className="text-[11px] text-green-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
            conectado
          </span>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-background custom-scrollbar">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-muted">
              No hay mensajes aún. Escribe algo para empezar.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatBubble
              key={msg.id}
              message={msg}
              isOwn={msg.sender === "student"}
              avatarUrl={
                msg.sender === "student" ? studentAvatarUrl : undefined
              }
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t-2 border-border bg-surface shrink-0">
        <ChatInput onSend={handleSend} />
      </div>
    </div>
  );
}
