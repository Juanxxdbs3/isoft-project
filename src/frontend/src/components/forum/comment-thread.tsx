"use client";

import { useState, useEffect } from "react";
import { EyeOff, SendHorizonal, Pencil, Trash2, X, Check } from "lucide-react";
import { Avatar } from "../ui/avatar";
import { apiGet, apiPost, apiPatch, apiDelete, ApiError } from "../../lib/api";
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
        <CommentItemDisplay
          key={comment.id}
          comment={comment}
          onUpdate={(id, text) => {
            const token = localStorage.getItem("access_token");
            if (!token) return;
            apiPatch(`/forum/comments/${id}`, { text_content: text }, token)
              .then(() => {
                setComments((prev) =>
                  prev.map((c) => (c.id === id ? { ...c, text } : c))
                );
              })
              .catch(() => alert("Error al editar el comentario"));
          }}
          onDelete={(id) => {
            if (!confirm("¿Estás seguro de eliminar este comentario?")) return;
            const token = localStorage.getItem("access_token");
            if (!token) return;
            apiDelete(`/forum/comments/${id}`, undefined, token)
              .then(() => setComments((prev) => prev.filter((c) => c.id !== id)))
              .catch(() => alert("Error al eliminar el comentario"));
          }}
        />
      ))}

      {error && (
        <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
      )}

      {forumDisabled ? (
        <div className="flex items-center gap-2 pt-3 text-xs text-muted">
          <EyeOff size={14} className="text-primary" />
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

function CommentItemDisplay({
  comment,
  onUpdate,
  onDelete,
}: {
  comment: CommentItemType;
  onUpdate: (id: string, text: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);

  const currentPseudonym =
    typeof window !== "undefined" ? localStorage.getItem("pseudonym") : null;
  const isOwner = currentPseudonym === comment.pseudonym;

  return (
    <div className="flex gap-3">
      <Avatar seed={comment.pseudonym} size={28} url={comment.avatarUrl} className="shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-semibold text-foreground">{comment.pseudonym}</span>
          <span className="text-[10px] text-muted">{formatCommentDate(comment.createdAt)}</span>
          {isOwner && !editing && (
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={() => { setEditing(true); setEditText(comment.text); }}
                className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-sidebar transition-colors"
                aria-label="Editar comentario"
              >
                <Pencil size={12} />
              </button>
              <button
                onClick={() => onDelete(comment.id)}
                className="p-1 rounded-lg text-muted hover:text-red-600 hover:bg-red-50 transition-colors"
                aria-label="Eliminar comentario"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )}
        </div>
        {editing ? (
          <div className="space-y-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
              rows={2}
              maxLength={1000}
              autoFocus
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => { onUpdate(comment.id, editText); setEditing(false); }}
                className="px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Check size={14} className="inline mr-1" />
                Guardar
              </button>
              <button
                onClick={() => setEditing(false)}
                className="px-3 py-1.5 text-xs text-muted hover:text-foreground transition-colors"
              >
                <X size={14} className="inline mr-1" />
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground leading-relaxed">{comment.text}</p>
        )}
      </div>
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
