import { formatDateShort } from "../../lib/format-date";

interface PostItem {
  id: string;
  text_content: string;
  created_at: string;
}

interface CasePostHistoryProps {
  posts: PostItem[];
}

export function CasePostHistory({ posts }: CasePostHistoryProps) {
  if (!posts || posts.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-foreground mb-2">Historial de publicaciones</h3>
        <p className="text-xs text-muted">No hay publicaciones anteriores a la última alerta</p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-2xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">
        Historial de publicaciones ({posts.length})
      </h3>
      <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
        {posts.map((post) => (
          <div key={post.id} className="text-xs bg-background rounded-xl p-3 space-y-1">
            <span className="text-muted">{formatDateShort(post.created_at)}</span>
            <p className="text-foreground line-clamp-3">{post.text_content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
