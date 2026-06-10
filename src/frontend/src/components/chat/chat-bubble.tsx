"use client";

import type { ChatMessageItem } from "../../types/domain";
import { Avatar } from "../ui/avatar";

interface ChatBubbleProps {
  message: ChatMessageItem;
  isOwn: boolean;
  avatarUrl?: string;
}

export function ChatBubble({ message, isOwn, avatarUrl }: ChatBubbleProps) {
  return (
    <div className={`flex gap-2 ${isOwn ? "justify-end" : "justify-start"}`}>
      {!isOwn && (
        <div className="shrink-0 self-end">
          <Avatar seed={message.text} size={28} url={avatarUrl} />
        </div>
      )}
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
