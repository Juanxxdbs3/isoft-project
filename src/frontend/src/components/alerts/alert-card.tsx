"use client";

import { useState } from "react";
import Link from "next/link";
import { RiskBadge } from "../forum/risk-badge";
import { apiPost } from "../../lib/api";
import { riskLevelTranslation, alertStatusTranslation } from "../../lib/i18n/risk";
import { formatDateShort } from "../../lib/format-date";
import type { NivelRiesgo, EstadoAlerta } from "../../types/domain";

interface AlertCardProps {
  id: string;
  pseudonym: string;
  risk_level: string;
  status: string;
  is_complementary: boolean;
  trigger_text: string;
  generated_at: string;
}

export function AlertCard({
  id,
  pseudonym,
  risk_level,
  status,
  is_complementary,
  trigger_text,
  generated_at,
}: AlertCardProps) {
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const level = riskLevelTranslation[risk_level] as NivelRiesgo | undefined;
  const statusText = alertStatusTranslation[status] as EstadoAlerta | undefined;

  const formattedDate = formatDateShort(generated_at);

  async function handleAccept(e: React.MouseEvent) {
    e.stopPropagation();
    setAccepting(true);
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return;
      await apiPost(`/alerts/${id}/accept`, {}, token);
      setAccepted(true);
    } catch {
      // error silently handled; user can retry
    } finally {
      setAccepting(false);
    }
  }

  const isHigh = risk_level === "HIGH";
  const isPending = status === "PENDING" && !accepted;

  return (
    <Link href={`/dashboard/alerts/${id}`} className="block cursor-pointer">
      <div
        className={`bg-surface border border-border rounded-2xl p-4 flex flex-col gap-2 transition-shadow hover:shadow-sm ${
          isHigh ? "border-l-4 border-l-risk-high" : ""
        }`}
      >
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {level && <RiskBadge level={level} />}
          {is_complementary && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-risk-medium-bg text-risk-medium-text">
              Complementaria
            </span>
          )}
          {statusText && (
            <span className="text-[10px] text-muted uppercase tracking-wider">
              {statusText}
            </span>
          )}
        </div>
        <span className="text-[10px] text-muted whitespace-nowrap">{formattedDate}</span>
      </div>

      {/* Pseudonym */}
      <span className="text-sm font-semibold text-foreground truncate">
        {pseudonym}
      </span>

      {/* Trigger text */}
      <p className="text-xs text-muted line-clamp-2">{trigger_text}</p>

      {/* Actions */}
      {isPending && (
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
          >
            {accepting ? "Aceptando..." : "Aceptar caso"}
          </button>
        </div>
      )}
      </div>
    </Link>
  );
}
