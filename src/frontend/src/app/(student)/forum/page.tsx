"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { PostCard } from "../../../components/forum/post-card";
import { PostPagination } from "../../../components/forum/post-pagination";
import { CreatePostForm } from "../../../components/forum/create-post-form";
import postsData from "../../../lib/mock/posts.json";
import type { PostSummary } from "../../../types/domain";

const POSTS_PER_PAGE = 5;

const allPosts: PostSummary[] = postsData as PostSummary[];

export default function ForumPage() {
  const [page, setPage] = useState(1);
  const [posts, setPosts] = useState<PostSummary[]>(allPosts);

  const totalPages = Math.max(1, Math.ceil(posts.length / POSTS_PER_PAGE));
  const visiblePosts = useMemo(
    () => posts.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE),
    [posts, page]
  );

  function handlePostCreated() {
    // After creating a post, refresh the list (in real flow, re-fetch from API)
    setPage(1);
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Image
          src="/forum-empty.svg"
          alt="Foro vacío"
          width={200}
          height={160}
          className="mb-6 opacity-70"
        />
        <h2 className="text-xl font-bold font-display text-foreground mb-2">
          ¡Vaya, el foro está muy tranquilo hoy!
        </h2>
        <p className="text-sm text-muted max-w-xs mb-8">
          Está algo helado por aquí… Sé el primero en iniciar una conversación.
        </p>
        <CreatePostForm onPostCreated={handlePostCreated} />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold font-display text-foreground mb-6">Foro</h1>

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
