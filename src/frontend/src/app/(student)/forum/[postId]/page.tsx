"use client";

import { useMemo } from "react";
import { useParams, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { CommentThread } from "../../../../components/forum/comment-thread";
import postsData from "../../../../lib/mock/posts.json";
import type { PostSummary } from "../../../../types/domain";

const allPosts = postsData as PostSummary[];

export default function PostDetailPage() {
  const params = useParams<{ postId: string }>();

  const post = useMemo(
    () => allPosts.find((p) => p.id === params.postId),
    [params.postId]
  );

  if (!post) notFound();

  return (
    <div>
      <Link
        href="/foro"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground
                   mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Volver al foro
      </Link>

      <article className="bg-surface border border-border rounded-2xl p-6 mb-8">
        <div className="flex items-start justify-between mb-3">
          <span className="text-sm font-semibold text-primary">{post.pseudonym}</span>
          <span className="text-xs text-muted">{formatDetailDate(post.createdAt)}</span>
        </div>
        <p className="text-sm text-foreground leading-relaxed mb-4">{post.text}</p>
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <MessageCircle size={14} />
          <span>{post.commentCount} comentario{post.commentCount !== 1 ? "s" : ""}</span>
        </div>
      </article>

      <h2 className="text-sm font-semibold text-foreground mb-4">
        Comentarios ({post.commentCount})
      </h2>

      <CommentThread postId={post.id} />
    </div>
  );
}

function formatDetailDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
