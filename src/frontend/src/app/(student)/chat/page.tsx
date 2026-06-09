"use client";

import { useState, useRef, useEffect } from "react";
import { ChatHeader } from "../../../components/chat/chat-header";
import { ChatMessage } from "../../../components/chat/chat-message";
import { ChatInput } from "../../../components/chat/chat-input";

interface MockMessage {
  id: string;
  text: string;
  sender: "student" | "psychologist";
  sentAt: Date;
  senderPseudonym: string;
  senderAvatarUrl?: string;
}

const AVATAR_BASE = process.env.NEXT_PUBLIC_AVATAR_BASE_URL || "https://api.dicebear.com/10.x";
const PSYCHOLOGIST_NAME = "Equipo de Bienestar Universitario";

const INITIAL_MESSAGES: MockMessage[] = [
  {
    id: "1",
    text: "¡Bienvenido al chat de apoyo! Soy parte del equipo de bienestar universitario. ¿Cómo te sientes hoy?",
    sender: "psychologist",
    sentAt: new Date(Date.now() - 3600000),
    senderPseudonym: PSYCHOLOGIST_NAME,
    senderAvatarUrl: `${AVATAR_BASE}/open-peeps/svg?seed=equipo-bienestar`,
  },
  {
    id: "2",
    text: "Hola, gracias. La verdad he estado un poco ansioso últimamente.",
    sender: "student",
    sentAt: new Date(Date.now() - 1800000),
    senderPseudonym: "",
  },
  {
    id: "3",
    text: "Entiendo cómo te sientes. La ansiedad es algo muy común entre estudiantes. ¿Te gustaría contarme más sobre lo que te preocupa?",
    sender: "psychologist",
    sentAt: new Date(Date.now() - 900000),
    senderPseudonym: PSYCHOLOGIST_NAME,
    senderAvatarUrl: `${AVATAR_BASE}/open-peeps/svg?seed=equipo-bienestar`,
  },
];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export default function StudentChatPage() {
  const [messages, setMessages] = useState<MockMessage[]>(INITIAL_MESSAGES);
  const [pseudonym, setPseudonym] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPseudonym(localStorage.getItem("pseudonym") || "Estudiante");
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend(text: string) {
    const newMsg: MockMessage = {
      id: generateId(),
      text,
      sender: "student",
      sentAt: new Date(),
      senderPseudonym: pseudonym,
    };
    setMessages((prev) => [...prev, newMsg]);
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-10rem)] border-2 border-border rounded-2xl overflow-hidden bg-surface shadow-sm">
      {/* Header */}
      <ChatHeader
        name={PSYCHOLOGIST_NAME}
        avatarUrl={`${AVATAR_BASE}/open-peeps/svg?seed=equipo-bienestar`}
        status="conectado"
      />

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-background custom-scrollbar">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            text={msg.text}
            isOwn={msg.sender === "student"}
            sentAt={msg.sentAt}
            senderPseudonym={msg.senderPseudonym}
            senderAvatarUrl={msg.sender === "psychologist" ? msg.senderAvatarUrl : undefined}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t-2 border-border bg-surface shrink-0">
        <ChatInput onSend={handleSend} />
      </div>
    </div>
  );
}
