"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RiskBadge } from "../forum/risk-badge";
import { NlpScoresPanel } from "./nlp-scores-panel";
import { PostHistoryList } from "./post-history-list";
import { apiPost, apiPatch } from "../../lib/api";
import { riskLevelTranslation, alertStatusTranslation } from "../../lib/i18n/risk";
import { formatDate } from "../../lib/format-date";
import type { NivelRiesgo, EstadoAlerta } from "../../types/domain";

interface DeanonymizedData {
  student_code: string;
  nombre_completo: string | null;
  programa: string | null;
  semestre: number | null;
  correo_contacto: string | null;
}

interface NlpDetail {
  id: string;
  depressive_probability: number | null;
  anxiety_probability: number | null;
  suicidal_probability: number | null;
  base_malaise_index: number | null;
  suicidal_override: boolean;
  risk_level: string;
  analyzed_at: string;
}

interface PostHistoryItem {
  id: string;
  text_content: string;
  created_at: string;
}

interface AlertDetailData {
  id: string;
  risk_level: string;
  status: string;
  generated_at: string;
  campus: string;
  is_complementary: boolean;
  ai_generated_summary: string | null;
  pseudonym: string;
  avatar_url: string | null;
  deanonymized_data: DeanonymizedData | null;
  post_history: PostHistoryItem[];
  nlp_detail: NlpDetail | null;
}

interface AlertDetailPanelProps {
  alert: AlertDetailData;
}

export function AlertDetailPanel({ alert }: AlertDetailPanelProps) {
  const router = useRouter();
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [formattedDate, setFormattedDate] = useState("");

  useEffect(() => {
    setFormattedDate(formatDate(alert.generated_at));
  }, [alert.generated_at]);

  async function handleReject() {
    setRejecting(true);
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return;
      await apiPatch(`/alerts/${alert.id}/status`, { status: "FALSE_POSITIVE" }, token);
      setRejected(true);
      router.refresh();
    } catch {
      // error silently handled
    } finally {
      setRejecting(false);
    }
  }

  const isPending = alert.status === "PENDING" && !accepted && !rejected;
  const isBlurred = alert.status === "PENDING";

  const level = riskLevelTranslation[alert.risk_level] as NivelRiesgo | undefined;
  const statusText = alertStatusTranslation[alert.status] as EstadoAlerta | undefined;

  async function handleAccept() {
    setAccepting(true);
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return;
      await apiPost(`/alerts/${alert.id}/accept`, {}, token);
      setAccepted(true);
      router.refresh();
    } catch {
      // error silently handled
    } finally {
      setAccepting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {level && <RiskBadge level={level} />}
            {statusText && (
              <span className="text-xs text-muted uppercase tracking-wider">
                {statusText}
              </span>
            )}
            {alert.is_complementary && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-risk-medium-bg text-risk-medium-text">
                Complementaria
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold font-display text-foreground">
            {alert.pseudonym}
          </h1>
          <p className="text-xs text-muted">{formattedDate}</p>
        </div>
      </div>

      {/* AI Summary */}
      {alert.ai_generated_summary && (
        <div className="bg-surface border border-border rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-1">Resumen de IA</h3>
          <p className="text-xs text-muted">{alert.ai_generated_summary}</p>
        </div>
      )}

      {/* NLP Scores */}
      {alert.nlp_detail && (
        <NlpScoresPanel
          depressive_probability={alert.nlp_detail.depressive_probability}
          anxiety_probability={alert.nlp_detail.anxiety_probability}
          suicidal_probability={alert.nlp_detail.suicidal_probability}
          base_malaise_index={alert.nlp_detail.base_malaise_index}
          suicidal_override={alert.nlp_detail.suicidal_override}
          risk_level={alert.nlp_detail.risk_level}
          analyzed_at={alert.nlp_detail.analyzed_at}
        />
      )}

      {/* Deanonymized data — blurred if PENDING */}
      <div className={`bg-surface border border-border rounded-2xl p-4 space-y-2 ${isBlurred ? "blur-[4px] pointer-events-none select-none" : ""}`}>
        <h3 className="text-sm font-semibold text-foreground">Datos del Estudiante</h3>
        {alert.deanonymized_data ? (
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-muted">Código estudiantil</span>
              <p className="text-foreground font-medium">
                {alert.deanonymized_data.student_code || "••••••••"}
              </p>
            </div>
            <div>
              <span className="text-muted">Sede</span>
              <p className="text-foreground font-medium">
                {alert.campus?.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) || "—"}
              </p>
            </div>
            <div>
              <span className="text-muted">Nombre completo</span>
              <p className="text-foreground font-medium">
                {alert.deanonymized_data.nombre_completo || "—"}
              </p>
            </div>
            <div>
              <span className="text-muted">Programa</span>
              <p className="text-foreground font-medium">
                {alert.deanonymized_data.programa || "—"}
              </p>
            </div>
            <div>
              <span className="text-muted">Semestre</span>
              <p className="text-foreground font-medium">
                {alert.deanonymized_data.semestre != null ? String(alert.deanonymized_data.semestre) : "—"}
              </p>
            </div>
            <div>
              <span className="text-muted">Correo contacto</span>
              <p className="text-foreground font-medium">
                {alert.deanonymized_data.correo_contacto || "—"}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-muted">Código estudiantil</span>
              <p className="text-foreground font-medium">••••••••</p>
            </div>
            <div>
              <span className="text-muted">Sede</span>
              <p className="text-foreground font-medium">••••••••</p>
            </div>
            <div>
              <span className="text-muted">Nombre completo</span>
              <p className="text-foreground font-medium">••••••••</p>
            </div>
            <div>
              <span className="text-muted">Programa</span>
              <p className="text-foreground font-medium">••••••••</p>
            </div>
            <div>
              <span className="text-muted">Semestre</span>
              <p className="text-foreground font-medium">••••••••</p>
            </div>
            <div>
              <span className="text-muted">Correo contacto</span>
              <p className="text-foreground font-medium">••••••••</p>
            </div>
          </div>
        )}
      </div>

      {/* Post history */}
      <PostHistoryList
        posts={alert.post_history}
        triggerText={alert.ai_generated_summary || ""}
      />

      {/* Actions */}
      {isPending && (
        <div className="flex flex-col gap-2">
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="w-full py-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
          >
            {accepting ? "Aceptando..." : "Aceptar caso"}
          </button>
          <button
            onClick={handleReject}
            disabled={rejecting}
            className="w-full py-3 rounded-xl text-sm font-semibold bg-surface text-muted border border-border hover:bg-border hover:text-foreground disabled:opacity-50 transition-colors cursor-pointer"
          >
            {rejecting ? "Descartando..." : "Marcar como falso positivo"}
          </button>
        </div>
      )}

      {/* Accepted confirmation */}
      {accepted && (
        <div className="bg-risk-low-bg border border-risk-low rounded-2xl p-4 text-center">
          <p className="text-sm font-semibold text-risk-low">
            Alerta aceptada correctamente
          </p>
        </div>
      )}

      {/* Rejected confirmation */}
      {rejected && (
        <div className="bg-muted border border-border rounded-2xl p-4 text-center">
          <p className="text-sm font-semibold text-muted">
            Alerta descartada como falso positivo
          </p>
        </div>
      )}
    </div>
  );
}
