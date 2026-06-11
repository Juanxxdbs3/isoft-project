"use client";

import { FileText } from "lucide-react";

export function CaseActions() {
  return (
    <div className="bg-surface border border-border rounded-2xl p-4">
      <h3 className="text-sm font-semibold text-foreground mb-2">Acciones</h3>
      <div className="flex flex-wrap gap-2">
        <span
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-border/30 text-muted opacity-50 cursor-not-allowed"
          title="Próximamente"
        >
          <FileText size={14} />
          Exportar PDF
        </span>
      </div>
    </div>
  );
}
