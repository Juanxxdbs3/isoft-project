import { Avatar } from "../ui/avatar";

interface ChatHeaderProps {
  name: string;
  avatarUrl?: string;
  status: string;
}

export function ChatHeader({ name, avatarUrl, status }: ChatHeaderProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-surface border-b border-border shrink-0">
      <Avatar seed={name} size={36} url={avatarUrl} />
      <div>
        <h2 className="text-sm font-semibold text-foreground">{name}</h2>
        <span className="text-[11px] text-green-500 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
          {status}
        </span>
      </div>
    </div>
  );
}
