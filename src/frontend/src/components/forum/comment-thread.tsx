"use client";

import { useState, useEffect } from "react";
import { EyeOff, SendHorizonal } from "lucide-react";
import { Avatar } from "../ui/avatar";
import { apiGet, apiPost, ApiError } from "../../lib/api";
import type { CommentItem as CommentItemType, EstadoContenido } from "../../types/domain";

interface PsychologistProfile {
  participacion_foro_habilitada: boolean;
}

interface CommentThreadProps {
  postId: string;
  initialComments?: CommentItemType[];
}

export function CommentThread({ postId, initialComments = [] }: CommentThreadProps) {
  const [comments, setComments] = useState<CommentItemType[]>(initialComments);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forumDisabled, setForumDisabled] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "psychologist") return;
    const token = localStorage.getItem("access_token");
    if (!token) return;
    apiGet<PsychologistProfile>("/auth/me", token)
      .then((profile) => setForumDisabled(!profile.participacion_foro_habilitada))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newComment.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    setError(null);
    const token = localStorage.getItem("access_token");

    try {
      await apiPost(
        `/forum/posts/${postId}/comments`,
        { text_content: trimmed },
        token || undefined
      );

      // Refetch comments after successful creation
      const result = await apiGet<
        { id: string; text: string; createdAt: string; status: string; pseudonym: string; avatar_url?: string }[]
      >(`/forum/posts/${postId}/comments`, token || undefined);

      setComments(
        result.map((c) => ({
          id: c.id,
          pseudonym: c.pseudonym,
          text: c.text,
          createdAt: c.createdAt,
          status: c.status as EstadoContenido,
          avatarUrl: c.avatar_url || undefined,
        }))
      );
      setNewComment("");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Error al publicar el comentario");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <div key={comment.id} className="flex gap-3">
          <Avatar seed={comment.pseudonym} size={28} url={comment.avatarUrl} className="shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-semibold text-foreground">{comment.pseudonym}</span>
              <span className="text-[10px] text-muted">{formatCommentDate(comment.createdAt)}</span>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{comment.text}</p>
          </div>
        </div>
      ))}

      {error && (
        <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
      )}

      {forumDisabled ? (
        <div className="flex items-center gap-2 pt-3 text-xs text-purple-800 dark:text-purple-300">
          <EyeOff size={14} className="text-purple-950 dark:text-purple-200" />
          <span>El modo de monitoreo clínico no permite participar en comentarios.</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2 pt-2">
          <input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Escribe un comentario…"
            maxLength={300}
            disabled={submitting}
            className="flex-1 px-3 py-2 bg-surface border border-input rounded-xl text-sm
                       text-foreground placeholder:text-muted/50
                       focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
                       disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!newComment.trim() || submitting}
            className="px-3 py-2 bg-primary text-white rounded-xl hover:bg-primary/90
                       transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Enviar comentario"
          >
            <SendHorizonal size={16} />
          </button>
        </form>
      )}
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
