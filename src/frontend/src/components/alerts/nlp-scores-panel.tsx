"use client";

import { RiskBadge } from "../forum/risk-badge";
import { riskLevelTranslation } from "../../lib/i18n/risk";
import { formatDate } from "../../lib/format-date";
import type { NivelRiesgo } from "../../types/domain";

interface NlpScoresPanelProps {
  depressive_probability: number | null;
  anxiety_probability: number | null;
  suicidal_probability: number | null;
  base_malaise_index: number | null;
  suicidal_override: boolean;
  risk_level: string;
  analyzed_at: string;
}

function ScoreBar({ label, value, color }: { label: string; value: number | null; color: string }) {
  const pct = value != null ? Math.round(value) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-semibold text-foreground">{value != null ? `${pct}%` : "N/D"}</span>
      </div>
      <div className="h-2 rounded-full bg-risk-low-bg overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${value != null ? pct : 0}%` }}
        />
      </div>
    </div>
  );
}

export function NlpScoresPanel({
  depressive_probability,
  anxiety_probability,
  suicidal_probability,
  base_malaise_index,
  suicidal_override,
  risk_level,
  analyzed_at,
}: NlpScoresPanelProps) {
  const level = riskLevelTranslation[risk_level] as NivelRiesgo | undefined;
  const date = formatDate(analyzed_at);

  return (
    <div className="bg-surface border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Puntuaciones NLP</h3>
        <div className="flex items-center gap-2">
          {level && <RiskBadge level={level} />}
          {suicidal_override && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-risk-high-bg text-risk-high">
              Override: Suicida
            </span>
          )}
        </div>
      </div>

      <ScoreBar
        label="Prob. depresión"
        value={depressive_probability}
        color="bg-risk-low"
      />
      <ScoreBar
        label="Prob. ansiedad"
        value={anxiety_probability}
        color="bg-risk-medium"
      />
      <ScoreBar
        label="Prob. suicida"
        value={suicidal_probability}
        color="bg-risk-high"
      />
      <ScoreBar
        label="IMB"
        value={base_malaise_index}
        color="bg-primary"
      />

      <p className="text-[10px] text-muted text-right">Analizado: {date}</p>
    </div>
  );
}
