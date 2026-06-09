import { Avatar } from "../ui/avatar";

interface ChatMessageProps {
  text: string;
  isOwn: boolean;
  sentAt: Date;
  senderPseudonym: string;
  senderAvatarUrl?: string;
}

export function ChatMessage({ text, isOwn, sentAt, senderPseudonym, senderAvatarUrl }: ChatMessageProps) {
  const time = sentAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} items-end gap-2`}>
      {!isOwn && (
        <Avatar
          seed={senderPseudonym}
          size={28}
          url={senderAvatarUrl}
          className="mb-1 shrink-0"
        />
      )}
      <div className={`max-w-[75%] flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
            isOwn
              ? "bg-primary text-white rounded-br-md"
              : "bg-surface text-foreground border border-border rounded-bl-md"
          }`}
        >
          {text}
        </div>
        <span className={`text-[10px] text-muted mt-0.5 block ${isOwn ? "text-right" : "text-left"}`}>
          {time}
        </span>
      </div>
    </div>
  );
}
