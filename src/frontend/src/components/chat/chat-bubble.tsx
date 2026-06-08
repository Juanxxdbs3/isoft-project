"use client";

import type { ChatMessageItem } from "../../types/domain";

interface ChatBubbleProps {
  message: ChatMessageItem;
  isOwn: boolean;
}

export function ChatBubble({ message, isOwn }: ChatBubbleProps) {
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`rounded-2xl px-3 py-2 max-w-[80%] text-sm ${
          isOwn
            ? "bg-primary text-white"
            : "bg-surface text-foreground border border-border"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.text}</p>
        <span
          className={`text-[10px] block mt-1 ${
            isOwn ? "text-white/60" : "text-muted"
          }`}
        >
          {new Date(message.sentAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}
