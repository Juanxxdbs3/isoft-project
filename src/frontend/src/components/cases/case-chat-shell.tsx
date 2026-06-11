"use client";

import { useState } from "react";
import { MessageSquare, X } from "lucide-react";
import { ChatBubble } from "../chat/chat-bubble";
import { PsychologistChatInput } from "../chat/psychologist-chat-input";
import type { ChatMessageItem as DomainChatMessage } from "../../types/domain";

interface CaseChatShellProps {
  caseId: string;
  chatRoom: { id: string | null; status: string | null };
  studentName: string;
  studentAvatarUrl?: string;
}

let tempIdCounter = 0;
function nextTempId(): string {
  tempIdCounter += 1;
  return `temp_${Date.now()}_${tempIdCounter}`;
}

export function CaseChatShell({
  caseId: _caseId,
  chatRoom: _chatRoom,
  studentName,
  studentAvatarUrl,
}: CaseChatShellProps) {
  const [messages, setMessages] = useState<DomainChatMessage[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  function handleSend(text: string, messageType: string) {
    const msg: DomainChatMessage = {
      id: nextTempId(),
      sender: "psychologist",
      text,
      type: messageType === "APPOINTMENT_PROPOSAL" ? "propuesta_cita"
        : messageType === "CHARACTERIZATION_LINK" ? "recurso_bienestar"
        : "texto",
      sentAt: new Date().toISOString(),
      read: true,
    };
    setMessages((prev) => [...prev, msg]);
  }

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
        {messages.length === 0 ? (
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
      </div>

      <PsychologistChatInput onSend={handleSend} />
    </div>
  );
}
