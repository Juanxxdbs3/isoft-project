import { ChevronLeft, ChevronRight } from "lucide-react";

interface PostPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function PostPagination({ currentPage, totalPages, onPageChange }: PostPaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | "ellipsis")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "ellipsis") {
      pages.push("ellipsis");
    }
  }

  return (
    <nav className="flex items-center justify-center gap-1 mt-8" aria-label="Paginación">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="w-9 h-9 flex items-center justify-center rounded-lg text-muted
                   hover:text-foreground hover:bg-surface border border-border
                   disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        aria-label="Página anterior"
        title="Página anterior"
      >
        <ChevronLeft size={16} />
      </button>

      {pages.map((p, i) =>
        p === "ellipsis" ? (
          <span key={`e-${i}`} className="w-9 h-9 flex items-center justify-center text-xs text-muted">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
              p === currentPage
                ? "bg-primary text-white shadow-sm"
                : "text-muted hover:text-foreground hover:bg-surface border border-border"
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="w-9 h-9 flex items-center justify-center rounded-lg text-muted
                   hover:text-foreground hover:bg-surface border border-border
                   disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        aria-label="Página siguiente"
        title="Página siguiente"
      >
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}
