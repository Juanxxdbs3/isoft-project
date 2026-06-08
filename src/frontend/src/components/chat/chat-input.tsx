"use client";

import { useState } from "react";
import { SendHorizonal } from "lucide-react";

interface ChatInputProps {
  onSend: (text: string) => Promise<void>;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending || disabled) return;
    setSending(true);
    try {
      await onSend(trimmed);
      setText("");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-3 border-t border-border bg-surface">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Escribe un mensaje…"
        maxLength={2000}
        disabled={sending || disabled}
        className="flex-1 px-3 py-2 bg-background border border-input rounded-xl text-sm
                   text-foreground placeholder:text-muted/50
                   focus:outline-none focus:ring-2 focus:ring-primary/40
                   disabled:opacity-50"
        aria-label="Mensaje"
      />
      <button
        type="submit"
        disabled={!text.trim() || sending || disabled}
        className="px-3 py-2 bg-primary text-white rounded-xl hover:bg-primary/90
                   transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        aria-label="Enviar mensaje"
      >
        {sending ? (
          <span className="block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <SendHorizonal size={16} />
        )}
      </button>
    </form>
  );
}
