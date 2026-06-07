"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ClipboardList, Calendar, Pencil } from "lucide-react";
import { Avatar } from "../../../components/ui/avatar";
import { PostCard } from "../../../components/forum/post-card";
import { apiGet, apiPatch, ApiError } from "../../../lib/api";
import type { PostSummary } from "../../../types/domain";

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted text-center py-10">Cargando perfil…</div>}>
      <ProfileContent />
    </Suspense>
  );
}

function ProfileContent() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "info";

  const [pseudonym, setPseudonym] = useState<string | null>(null);
  const [campus, setCampus] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [avatarInput, setAvatarInput] = useState("");
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [userPosts, setUserPosts] = useState<PostSummary[]>([]);

  async function handleSaveAvatar() {
    const trimmed = avatarInput.trim();
    if (!trimmed) return;
    setAvatarSaving(true);
    try {
      const token = localStorage.getItem("access_token");
      await apiPatch("/forum/profile/avatar", { avatar_url: trimmed }, token || undefined);
      localStorage.setItem("avatar_url", trimmed);
      setAvatarUrl(trimmed);
      setEditingAvatar(false);
    } catch {
      // ignore
    } finally {
      setAvatarSaving(false);
    }
  }

  useEffect(() => {
    setPseudonym(localStorage.getItem("pseudonym"));
    setCampus(localStorage.getItem("campus"));
    setCreatedAt(localStorage.getItem("created_at") || localStorage.getItem("createdAt"));
    setAvatarUrl(localStorage.getItem("avatar_url"));

    // Fetch user's posts from API
    const token = localStorage.getItem("access_token");
    if (token) {
      apiGet<{ posts: any[] }>("/forum/posts/mine", token)
        .then((result) => {
          const mapped: PostSummary[] = result.posts.map((p: any) => ({
            id: p.id,
            pseudonym: p.pseudonym,
            text: p.text,
            createdAt: p.createdAt,
            status: p.status,
            commentCount: 0,
          }));
          setUserPosts(mapped);
        })
        .catch(() => {});
    }
  }, []);

  return (
    <div>
      {/* Profile header */}
      <div className="bg-surface border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <Avatar seed={pseudonym || "default"} size={56} />
            <button
              onClick={() => { setEditingAvatar(!editingAvatar); if (!editingAvatar) setAvatarInput(avatarUrl || ""); }}
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shadow-sm hover:bg-primary/90 transition-colors"
              aria-label="Cambiar avatar"
            >
              <Pencil size={12} />
            </button>
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">
              {pseudonym || "Cargando..."}
            </h1>
            <p className="text-sm text-muted">{campus || "Cargando..."}</p>
            <div className="flex items-center gap-1 text-xs text-muted mt-1">
              <Calendar size={12} />
              <span>Miembro desde {createdAt ? new Date(createdAt).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" }) : "Cargando..."}</span>
            </div>
          </div>
        </div>

        {editingAvatar && (
          <div className="mt-4 flex gap-2">
            <input
              value={avatarInput}
              onChange={(e) => setAvatarInput(e.target.value)}
              placeholder="URL del avatar (DiceBear seed)"
              maxLength={200}
              className="flex-1 px-3 py-1.5 bg-surface border border-input rounded-xl text-sm text-foreground
                         placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              onClick={handleSaveAvatar}
              disabled={avatarSaving || !avatarInput.trim()}
              className="px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-xl
                         hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {avatarSaving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        )}

        <div className="mt-4 flex gap-4 text-sm">
          <div className="text-muted">
            <span className="font-semibold text-foreground">{userPosts.length}</span>{" "}
            publicaciones
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 mb-6 bg-surface border border-border rounded-xl p-1">
        <Link
          href="/perfil?tab=info"
          className={`flex-1 py-2 text-sm font-medium rounded-lg text-center transition-colors ${
            tab === "info"
              ? "bg-primary text-white shadow-sm"
              : "text-muted hover:text-foreground"
          }`}
        >
          Información
        </Link>
        <Link
          href="/perfil?tab=posts"
          className={`flex-1 py-2 text-sm font-medium rounded-lg text-center transition-colors ${
            tab === "posts"
              ? "bg-primary text-white shadow-sm"
              : "text-muted hover:text-foreground"
          }`}
        >
          <ClipboardList size={14} className="inline mr-1" />
          Mis publicaciones
        </Link>
      </div>

      {/* Tab content */}
      {tab === "posts" ? (
        userPosts.length > 0 ? (
          <div className="space-y-3">
            {userPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted text-center py-10">
            Aún no has publicado nada en el foro.
          </p>
        )
      ) : (
        <div className="bg-surface border border-border rounded-2xl p-6 text-sm text-muted leading-relaxed">
          <p>
            Tu identidad está protegida por tu seudónimo. Los psicólogos solo pueden conocerte
            si aceptan un caso asociado a tus publicaciones.
          </p>
        </div>
      )}
    </div>
  );
}
