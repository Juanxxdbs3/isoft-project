"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { User, ClipboardList, Calendar } from "lucide-react";
import { PostCard } from "../../../components/forum/post-card";
import profileData from "../../../lib/mock/profile.json";
import postsData from "../../../lib/mock/posts.json";
import type { PostSummary } from "../../../types/domain";

const allPosts = postsData as PostSummary[];

export default function ProfilePage() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "info";

  const userPosts = useMemo(
    () => allPosts.filter((p) => p.pseudonym === profileData.pseudonym),
    []
  );

  return (
    <div>
      {/* Profile header */}
      <div className="bg-surface border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <User size={24} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">
              {profileData.pseudonym}
            </h1>
            <p className="text-sm text-muted">{profileData.sede}</p>
            <div className="flex items-center gap-1 text-xs text-muted mt-1">
              <Calendar size={12} />
              <span>Miembro desde {profileData.memberSince}</span>
            </div>
          </div>
        </div>
        <div className="mt-4 flex gap-4 text-sm">
          <div className="text-muted">
            <span className="font-semibold text-foreground">{profileData.postCount}</span>{" "}
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
