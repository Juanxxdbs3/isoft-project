"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { MessageSquare, X, Loader2, AlertCircle } from "lucide-react";
import { ChatBubble } from "../chat/chat-bubble";
import { PsychologistChatInput } from "../chat/psychologist-chat-input";
import { supabase } from "../../lib/supabase";
import { apiPost, apiGet } from "../../lib/api";
import type { ChatMessageItem as DomainChatMessage } from "../../types/domain";

interface CaseChatShellProps {
  caseId: string;
  chatRoom: { id: string | null; status: string | null };
  studentName: string;
  studentAvatarUrl?: string;
  token: string;
}

function mapMessage(msg: any): DomainChatMessage {
  return {
    id: msg.id,
    sender: msg.sender_role === "PSYCHOLOGIST" ? "psychologist" : "student",
    text: msg.text_content,
    type: msg.message_type === "APPOINTMENT_PROPOSAL" ? "propuesta_cita"
      : msg.message_type === "CHARACTERIZATION_LINK" ? "recurso_bienestar"
      : "texto",
    sentAt: msg.sent_at,
    read: msg.read ?? true,
  };
}

export function CaseChatShell({
  caseId,
  chatRoom,
  studentName,
  studentAvatarUrl,
  token,
}: CaseChatShellProps) {
  const [messages, setMessages] = useState<DomainChatMessage[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(chatRoom.id);
  const [roomLoading, setRoomLoading] = useState(!chatRoom.id);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [msgsLoading, setMsgsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    console.log("🔑 Inyectando JWT de autenticación en el cliente Supabase Realtime...");
    supabase.realtime.setAuth(token);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setUserId(payload.sub || null);
    } catch {
      setUserId(null);
    }
  }, [token]);

  useEffect(() => {
    if (chatRoom?.id) {
      setRoomId(chatRoom.id);
      setRoomLoading(false);
      return;
    }

    setRoomLoading(true);
    setRoomError(null);

    console.log("🚀 Inicializando sala de chat para el caso:", caseId);

    apiPost(`/cases/${caseId}/chat`, {}, token)
      .then((room: any) => {
        const targetId = room.id || room.chat_room_id;
        if (targetId) {
          setRoomId(targetId);
        } else {
          throw new Error("El backend no retornó un ID de sala válido.");
        }
        setRoomLoading(false);
      })
      .catch((err) => {
        if (
          err.status === 409 ||
          err.statusCode === 409 ||
          err.error === "ACTIVE_ROOM_EXISTS" ||
          String(err.message).toLowerCase().includes("exist")
        ) {
          console.log("ℹ️ La sala de chat ya existe en la BD. Recuperando credenciales vía GET...");

          apiGet(`/cases/${caseId}/chat`, token)
            .then((data: any) => {
              const existingId = data.id || data.chat_id || data.room_id || (data.chat_room && data.chat_room.id);
              if (existingId) {
                console.log("🎯 Sala existente recuperada exitosamente con ID:", existingId);
                setRoomId(existingId);
              } else {
                setRoomError("No se pudo extraer el ID de la sala de chat activa.");
              }
              setRoomLoading(false);
            })
            .catch((getErr) => {
              console.error("❌ Fallo al consultar la sala existente:", getErr);
              setRoomError("Error al conectar con la sala clínica.");
              setRoomLoading(false);
            });
        } else {
          console.error("❌ Error no controlado al inicializar el chat:", err);
          setRoomError(err.message || "Error al inicializar la sala de chat");
          setRoomLoading(false);
        }
      });
  }, [caseId, chatRoom?.id, token]);

  useEffect(() => {
    if (!roomId) return;
    setMsgsLoading(true);
    apiGet(`/cases/${caseId}/chat`, token)
      .then((data: any) => {
        setMessages((data.messages || []).map(mapMessage));
        setMsgsLoading(false);
      })
      .catch(() => setMsgsLoading(false));
  }, [caseId, roomId, token]);

  useEffect(() => {
    if (!roomId) return;

    console.log("🔌 Conectando al canal Realtime privado:", `room:${roomId}:messages`);

    const channel = supabase
      .channel(`room:${roomId}:messages`, {
        config: {
          private: true,
        },
      })
      .on("broadcast", { event: "INSERT" }, (payload) => {
        console.log("📥 ¡Mensaje Realtime recibido! (Payload):", payload);

        const msgData = payload.payload || (payload as any).record || payload;

        if (!msgData || !msgData.id) {
          console.warn("⚠️ Mensaje omitido: Estructura de payload inválida.");
          return;
        }

        if (userId && msgData.sender_id === userId) {
          console.log("⏭️ Mensaje propio ignorado (ya recibido vía POST response):", msgData.id);
          return;
        }

        setMessages((prev) => {
          if (prev.some((m) => m.id === msgData.id || m.id === `temp_${msgData.id}`)) return prev;
          return [...prev, mapMessage(msgData)];
        });
      });

    channel.subscribe((status) => {
      console.log(`📡 Estado de la suscripción para sala ${roomId}:`, status);
    });

    return () => {
      console.log("🔌 Limpiando y removiendo canal Realtime:", `room:${roomId}:messages`);
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback((text: string, messageType: string) => {
    if (!roomId) return;
    const tempId = `temp_${Date.now()}`;
    const optimisticMsg: DomainChatMessage = {
      id: tempId,
      sender: "psychologist",
      text,
      type: messageType === "APPOINTMENT_PROPOSAL" ? "propuesta_cita"
        : messageType === "CHARACTERIZATION_LINK" ? "recurso_bienestar"
        : "texto",
      sentAt: new Date().toISOString(),
      read: true,
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    apiPost(`/cases/${caseId}/chat/messages`, {
      text_content: text,
      message_type: messageType,
    }, token)
      .then((realMsg: any) => {
        setMessages((prev) => prev.map((m) => m.id === tempId ? mapMessage(realMsg) : m));
      })
      .catch(() => {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      });
  }, [caseId, roomId, token]);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed bottom-4 right-4 z-40 w-12 h-12 rounded-full bg-primary text-white shadow-lg flex items-center justify-center hover:bg-primary/90 transition-all"
        aria-label="Abrir chat"
      >
        <MessageSquare size={22} />
      </button>
    );
  }

  if (roomLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-surface border border-border rounded-2xl">
        <Loader2 size={20} className="text-muted animate-spin mb-2" />
        <p className="text-xs text-muted">Conectando chat clínico…</p>
      </div>
    );
  }

  if (roomError) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-surface border border-border rounded-2xl">
        <AlertCircle size={20} className="text-destructive mb-2" />
        <p className="text-xs text-muted">{roomError}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-surface border border-border rounded-2xl overflow-hidden h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-muted" />
          <h3 className="text-sm font-semibold text-foreground">
            Chat clínico — {studentName}
          </h3>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1 rounded-lg hover:bg-surface text-muted hover:text-foreground transition-colors"
          aria-label="Colapsar chat"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {msgsLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={16} className="text-muted animate-spin" />
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
              avatarUrl={msg.sender === "student" ? studentAvatarUrl : undefined}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <PsychologistChatInput onSend={handleSend} />
    </div>
  );
}
