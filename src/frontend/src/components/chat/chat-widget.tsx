"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, X, Minus } from "lucide-react";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { ChatMessageItem } from "@/types/domain";
import { mapSenderRole } from "@/types/domain";
import { ChatBubble } from "./chat-bubble";
import { ChatInput } from "./chat-input";

interface ChatWidgetProps {
  roomId: string;
  currentUserId: string;
  currentUserRole: "student" | "psychologist";
}

export function ChatWidget({ roomId, currentUserId, currentUserRole }: ChatWidgetProps) {
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [isMinimized, setIsMinimized] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // === Mount: fetch initial messages + subscribe to Realtime ===
  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      setError(null);

      // Fetch initial messages from API
      try {
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("access_token")
            : null;

        const data = await apiGet<ChatMessageItem[]>(
          `/chat/rooms/${roomId}/messages`,
          token || undefined,
        );

        if (!cancelled) {
          setMessages(data);
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError) {
            setError(err.message);
          } else {
            setError("Error al cargar mensajes");
          }
        }
        return;
      } finally {
        if (!cancelled) setLoading(false);
      }

      // Subscribe to Realtime broadcasts
      const channel = supabase.channel(`room:${roomId}:messages`, {
        config: { private: true },
      });

      channel.on("broadcast", { event: "INSERT" }, (payload) => {
        // The trigger broadcasts the NEW row; payload may be nested
        const record = payload.payload ?? payload;

        const newMessage: ChatMessageItem = {
          id: record.id,
          sender: mapSenderRole(record.sender_role || ""),
          text: record.text_content || record.text || "",
          type: record.type || "texto",
          sentAt: record.created_at || record.sentAt || new Date().toISOString(),
          read: record.read ?? false,
        };

        setMessages((prev) => [...prev, newMessage]);
      });

      channel.subscribe();
      channelRef.current = channel;
    }

    init();

    return () => {
      cancelled = true;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [roomId]); // eslint-disable-line react-hooks/exhaustive-deps

  // === Send message ===
  function handleSend(text: string) {
    if (!text.trim()) return;
    setError(null);

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("access_token")
        : null;

    apiPost(
      `/chat/rooms/${roomId}/messages`,
      { text_content: text.trim() },
      token || undefined,
    ).catch((err) => {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Error al enviar mensaje");
      }
    });
    // Realtime broadcast will append the message automatically
  }

  // === Toggle minimise / expand ===
  function toggleMinimize() {
    setIsMinimized((prev) => !prev);
  }

  // ================================================================
  // RENDER HELPERS
  // ================================================================

  /** Shared message list rendering */
  function renderMessages() {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-xs text-muted">Cargando mensajes…</p>
        </div>
      );
    }

    if (error && messages.length === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-xs text-red-500">{error}</p>
        </div>
      );
    }

    if (messages.length === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-xs text-muted">
            No hay mensajes aún. Escribe algo para empezar.
          </p>
        </div>
      );
    }

    return messages.map((message) => {
      const isOwn = message.sender === currentUserRole;
      return <ChatBubble key={message.id} message={message} isOwn={isOwn} />;
    });
  }

  // ================================================================
  // RENDER
  // ================================================================
  return (
    <>
      {/* ======== Minimised floating button (all screens) ======== */}
      {isMinimized && (
        <button
          onClick={toggleMinimize}
          className="fixed bottom-4 right-4 z-50 w-12 h-12 rounded-full
                     bg-primary text-white shadow-lg
                     flex items-center justify-center
                     hover:bg-primary/90 transition-all"
          aria-label="Abrir chat"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* ======== Expanded ======== */}
      {!isMinimized && (
        <>
          {/* ---- Desktop panel ---- */}
          <div
            className="hidden md:flex fixed bottom-4 right-4 z-50
                        w-80 max-h-96 flex-col
                        bg-surface border border-border rounded-2xl shadow-xl
                        overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-primary text-white shrink-0">
              <h3 className="text-sm font-semibold">Chat</h3>
              <button
                onClick={toggleMinimize}
                className="p-1 rounded-full hover:bg-white/20 transition-colors"
                aria-label="Minimizar chat"
              >
                <Minus size={16} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
              {renderMessages()}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <ChatInput onSend={handleSend} />

            {/* Error banner inside card */}
            {error && messages.length > 0 && (
              <div className="px-3 pb-2">
                <p className="text-xs text-red-500">{error}</p>
              </div>
            )}
          </div>

          {/* ---- Mobile fullscreen ---- */}
          <div className="md:hidden fixed inset-0 z-50 bg-background flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-primary text-white shrink-0">
              <h3 className="text-sm font-semibold">Chat</h3>
              <button
                onClick={toggleMinimize}
                className="p-1 rounded-full hover:bg-white/20 transition-colors"
                aria-label="Cerrar chat"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {renderMessages()}
              <div ref={messagesEndRef} />
            </div>

            {/* Input + error */}
            <ChatInput onSend={handleSend} />
            {error && messages.length > 0 && (
              <div className="px-3 pb-2">
                <p className="text-xs text-red-500">{error}</p>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
