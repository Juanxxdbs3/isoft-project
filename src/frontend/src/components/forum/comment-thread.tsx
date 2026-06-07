"use client";

import { useState } from "react";
import { SendHorizonal } from "lucide-react";
import type { CommentItem as CommentItemType } from "../../types/domain";
import commentsData from "../../lib/mock/comments.json";

const allComments = commentsData as Record<string, CommentItemType[]>;

interface CommentThreadProps {
  postId: string;
}

export function CommentThread({ postId }: CommentThreadProps) {
  const [comments, setComments] = useState<CommentItemType[]>(allComments[postId] || []);
  const [newComment, setNewComment] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newComment.trim();
    if (!trimmed) return;

    const optimistic: CommentItemType = {
      id: `cmt-opt-${Date.now()}`,
      pseudonym: "Tú",
      text: trimmed,
      createdAt: new Date().toISOString(),
      status: "visible" as const,
    };

    setComments((prev) => [...prev, optimistic]);
    setNewComment("");
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <div key={comment.id} className="flex gap-3">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-xs font-bold text-primary">
              {comment.pseudonym.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-semibold text-foreground">{comment.pseudonym}</span>
              <span className="text-[10px] text-muted">{formatCommentDate(comment.createdAt)}</span>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{comment.text}</p>
          </div>
        </div>
      ))}

      <form onSubmit={handleSubmit} className="flex gap-2 pt-2">
        <input
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Escribe un comentario…"
          maxLength={300}
          className="flex-1 px-3 py-2 bg-surface border border-input rounded-xl text-sm
                     text-foreground placeholder:text-muted/50
                     focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
        />
        <button
          type="submit"
          disabled={!newComment.trim()}
          className="px-3 py-2 bg-primary text-white rounded-xl hover:bg-primary/90
                     transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Enviar comentario"
        >
          <SendHorizonal size={16} />
        </button>
      </form>
    </div>
  );
}

function formatCommentDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const hours = Math.floor(diff / 3600000);

  if (hours < 1) return "Ahora";
  if (hours < 24) return `Hace ${hours}h`;
  if (hours < 48) return "Ayer";
  return d.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}
