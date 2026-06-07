"use client";

import { useEffect, useState } from "react";
import { useParams, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { CommentThread } from "../../../../components/forum/comment-thread";
import { apiGet } from "../../../../lib/api";
import type { CommentItem, PostSummary } from "../../../../types/domain";

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const [post, setPost] = useState<PostSummary | null>(null);
  const [commentCount, setCommentCount] = useState(0);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const [postResult, commentsResult] = await Promise.all([
          apiGet<{ id: string; text: string; createdAt: string; status: string; pseudonym: string }>(
            `/forum/posts/${params.id}`
          ),
          apiGet<{ id: string; text: string; createdAt: string; status: string; pseudonym: string }[]>(
            `/forum/posts/${params.id}/comments`
          ),
        ]);

        if (cancelled) return;

        setPost({
          id: postResult.id,
          pseudonym: postResult.pseudonym,
          text: postResult.text,
          createdAt: postResult.createdAt,
          status: postResult.status,
          commentCount: commentsResult.length,
        });
        setCommentCount(commentsResult.length);
        setComments(
          commentsResult.map((c) => ({
            id: c.id,
            pseudonym: c.pseudonym,
            text: c.text,
            createdAt: c.createdAt,
            status: c.status,
          }))
        );
      } catch {
        if (!cancelled) setPost(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [params.id]);

  if (loading) {
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
        <p className="text-sm text-muted text-center py-10">Cargando publicación…</p>
      </div>
    );
  }

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
          <span>{commentCount} comentario{commentCount !== 1 ? "s" : ""}</span>
        </div>
      </article>

      <h2 className="text-sm font-semibold text-foreground mb-4">
        Comentarios ({commentCount})
      </h2>

      <CommentThread postId={post.id} initialComments={comments} />
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
