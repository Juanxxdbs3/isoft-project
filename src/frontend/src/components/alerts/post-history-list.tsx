interface PostHistoryItem {
  id: string;
  text_content: string;
  created_at: string;
}

interface PostHistoryListProps {
  posts: PostHistoryItem[];
  triggerText: string;
}

export function PostHistoryList({ posts, triggerText }: PostHistoryListProps) {
  if (posts.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-foreground mb-2">Historial de Publicaciones</h3>
        <p className="text-xs text-muted">Sin publicaciones disponibles</p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-2xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Historial de Publicaciones</h3>
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {posts.map((post) => {
          const isTrigger = triggerText && post.text_content.includes(triggerText);
          return (
            <div
              key={post.id}
              className={`rounded-xl p-3 text-xs border ${
                isTrigger
                  ? "bg-risk-high-bg/20 border-l-2 border-l-risk-high border-border"
                  : "bg-background border-border"
              }`}
            >
              <p className="text-muted mb-1">
                {new Date(post.created_at).toLocaleDateString("es-CO", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
              <p className="text-foreground line-clamp-3">{post.text_content}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
