"use client";

import { useState, useMemo } from "react";
import { AlertList } from "./alert-list";

interface AlertItem {
  id: string;
  pseudonym: string;
  risk_level: string;
  status: string;
  is_complementary: boolean;
  trigger_text: string;
  generated_at: string;
}

interface AlertFeedProps {
  alerts: AlertItem[];
}

const FILTERS = [
  { key: null, label: "Todas", color: "" },
  { key: "HIGH", label: "Crítico", color: "border-red-400 text-red-700 bg-red-50" },
  { key: "MEDIUM", label: "Medio", color: "border-amber-400 text-amber-700 bg-amber-50" },
  { key: "LOW", label: "Bajo", color: "border-green-400 text-green-700 bg-green-50" },
] as const;

export function AlertFeed({ alerts }: AlertFeedProps) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!activeFilter) return alerts;
    return alerts.filter((a) => a.risk_level === activeFilter);
  }, [alerts, activeFilter]);

  return (
    <div>
      <h2 className="text-sm font-semibold text-foreground mb-3">Filtrar por nivel de riesgo</h2>
      <div className="flex flex-wrap gap-3 mb-6">
        {FILTERS.map((f) => {
          const isActive = activeFilter === f.key;
          const baseClass = "px-4 py-2 rounded-xl text-xs font-semibold border-2 transition-all cursor-pointer";
          const activeClass = isActive && f.key
            ? f.color + " ring-2 ring-offset-1 ring-black/10"
            : isActive && !f.key
            ? "border-foreground text-foreground bg-surface"
            : f.key
            ? f.color + " opacity-60"
            : "border-border text-muted bg-surface opacity-60";
          return (
            <button
              key={f.key || "all"}
              onClick={() => setActiveFilter(f.key)}
              className={`${baseClass} ${activeClass}`}
            >
              {f.label}
            </button>
          );
        })}
      </div>
      <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
        Alertas Activas
      </h2>
      <AlertList alerts={filtered} />
    </div>
  );
}
