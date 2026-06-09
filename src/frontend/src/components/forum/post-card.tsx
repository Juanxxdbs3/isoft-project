"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageCircle, Pencil, Trash2, X, Check } from "lucide-react";
import { Avatar } from "../ui/avatar";
import { apiPatch, apiDelete } from "../../lib/api";
import type { PostSummary } from "../../types/domain";

interface PostCardProps {
  post: PostSummary;
}

export function PostCard({ post }: PostCardProps) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(post.text);
  const [deleting, setDeleting] = useState(false);

  const currentPseudonym =
    typeof window !== "undefined" ? localStorage.getItem("pseudonym") : null;
  const isOwner = currentPseudonym === post.pseudonym;

  async function handleEdit() {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    try {
      await apiPatch(`/forum/posts/${post.id}`, { text_content: editText }, token);
      setEditing(false);
      window.location.reload();
    } catch {
      alert("Error al editar la publicación");
    }
  }

  async function handleDelete() {
    if (!confirm("¿Estás seguro de eliminar esta publicación?")) return;
    const token = localStorage.getItem("access_token");
    if (!token) return;
    try {
      await apiDelete(`/forum/posts/${post.id}`, undefined, token);
      setDeleting(true);
    } catch {
      alert("Error al eliminar la publicación");
    }
  }

  if (deleting) return null;

  const cardContent = (
    <>
      {/* Header: avatar, pseudonym, date */}
      <div className="flex items-center gap-2 mb-2">
        <Avatar
          seed={post.pseudonym}
          size={24}
          url={post.avatarUrl}
          className="shrink-0"
        />
        <span className="text-sm font-semibold text-primary">
          {post.pseudonym}
        </span>
        <span className="text-xs text-muted ml-auto">
          {formatDate(post.createdAt)}
        </span>
      </div>

      {/* Body: either editing textarea or static text */}
      {editing ? (
        <div onClick={(e) => e.stopPropagation()} className="space-y-2 mb-3">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
            rows={3}
            maxLength={2000}
            autoFocus
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleEdit}
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
        <p className="text-sm text-foreground leading-relaxed line-clamp-3 mb-3">
          {post.text}
        </p>
      )}

      {/* Footer: comment count + owner edit/delete buttons */}
      <div className="flex items-center gap-1.5 text-xs text-muted">
        <MessageCircle size={14} />
        <span>
          {post.commentCount} comentario
          {post.commentCount !== 1 ? "s" : ""}
        </span>
        {isOwner && !editing && (
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setEditing(true);
                setEditText(post.text);
              }}
              className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-sidebar transition-colors"
              aria-label="Editar publicación"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDelete();
              }}
              className="p-1.5 rounded-lg text-muted hover:text-red-600 hover:bg-red-50 transition-colors"
              aria-label="Eliminar publicación"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
    </>
  );

  // When editing, render a plain div instead of a Link (editing UI replaces navigation)
  if (editing) {
    return (
      <div className="block bg-surface border border-border rounded-2xl p-5">
        {cardContent}
      </div>
    );
  }

  return (
    <Link
      href={`/foro/${post.id}`}
      className="block bg-surface border border-border rounded-2xl p-5
                 hover:border-primary/30 hover:shadow-sm transition-all"
    >
      {cardContent}
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
