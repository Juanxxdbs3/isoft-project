"use client";

import { useState } from "react";
import { SendHorizonal } from "lucide-react";

interface ChatInputProps {
  onSend: (text: string) => void;
}

export function ChatInput({ onSend }: ChatInputProps) {
  const [text, setText] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 p-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Escribe un mensaje…"
        maxLength={2000}
        rows={1}
        className="flex-1 px-3 py-2 bg-background border border-input rounded-xl text-sm
                   text-foreground placeholder:text-muted/50 resize-none
                   focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
                   min-h-[38px] max-h-24"
        aria-label="Mensaje"
      />
      <button
        type="submit"
        disabled={!text.trim()}
        className="p-2.5 bg-primary text-white rounded-xl hover:bg-primary/90
                   transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        aria-label="Enviar mensaje"
      >
        <SendHorizonal size={18} />
      </button>
    </form>
  );
}
