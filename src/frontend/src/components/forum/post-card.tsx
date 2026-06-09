import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Avatar } from "../ui/avatar";
import type { PostSummary } from "../../types/domain";

interface PostCardProps {
  post: PostSummary;
}

export function PostCard({ post }: PostCardProps) {
  return (
    <Link
      href={`/foro/${post.id}`}
      className="block bg-surface border border-border rounded-2xl p-5
                 hover:border-primary/30 hover:shadow-sm transition-all"
    >
      <div className="flex items-center gap-2 mb-2">
        <Avatar seed={post.pseudonym} size={24} url={post.avatarUrl} className="shrink-0" />
        <span className="text-sm font-semibold text-primary">{post.pseudonym}</span>
        <span className="text-xs text-muted ml-auto">{formatDate(post.createdAt)}</span>
      </div>
      <p className="text-sm text-foreground leading-relaxed line-clamp-3 mb-3">
        {post.text}
      </p>
      <div className="flex items-center gap-1.5 text-xs text-muted">
        <MessageCircle size={14} />
        <span>{post.commentCount} comentario{post.commentCount !== 1 ? "s" : ""}</span>
      </div>
    </Link>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const hours = Math.floor(diff / 3600000);

  if (hours < 1) return "Ahora";
  if (hours < 24) return `Hace ${hours}h`;
  if (hours < 48) return "Ayer";
  return d.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}
