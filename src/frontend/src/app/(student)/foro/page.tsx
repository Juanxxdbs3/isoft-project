"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { PostCard } from "../../../components/forum/post-card";
import { PostPagination } from "../../../components/forum/post-pagination";
import { CreatePostForm } from "../../../components/forum/create-post-form";
import { apiGet } from "../../../lib/api";
import type { PostSummary } from "../../../types/domain";

const POSTS_PER_PAGE = 5;

export default function ForumPage() {
  const [page, setPage] = useState(1);
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  async function fetchPosts() {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const result = await apiGet<{ posts: any[]; total: number }>("/forum/posts", token || undefined);
      const mapped: PostSummary[] = result.posts.map((p: any) => ({
        id: p.id,
        pseudonym: p.pseudonym,
        text: p.text,
        createdAt: p.createdAt,
        status: p.status,
        commentCount: 0,
        avatarUrl: p.avatar_url || undefined,
      }));
      setPosts(mapped);
      setTotal(result.total);
    } catch {
      // keep empty state on error
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPosts();
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / POSTS_PER_PAGE));
  const visiblePosts = useMemo(
    () => posts.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE),
    [posts, page],
  );

  function handlePostCreated() {
    setPage(1);
    fetchPosts();
  }

  if (loading) {
    return (
      <div className="w-full py-5">
        <p className="text-sm text-muted text-center py-10">Cargando publicaciones…</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="w-full py-5">
        <CreatePostForm onPostCreated={handlePostCreated} />
        <div className="flex flex-col items-center text-center mt-8">
          <Image
            src="/forum-empty.svg"
            alt="Foro vacío"
            width={200}
            height={160}
            className="mb-6 opacity-70"
          />
          <h2 className="text-xl font-bold font-display text-muted mb-2">
            ¡Vaya, el foro está muy tranquilo hoy!
          </h2>
          <p className="text-sm text-muted max-w-xs mb-8">
            Está algo helado por aquí… Sé el primero en iniciar una conversación.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold font-display text-foreground mb-6">
        Foro
      </h1>

      <CreatePostForm onPostCreated={handlePostCreated} />

      <div className="space-y-3">
        {visiblePosts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      <PostPagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
