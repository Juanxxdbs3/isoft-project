"use client";

import Link from "next/link";
import { Avatar } from "../ui/avatar";
import { MessageSquare } from "lucide-react";

interface CaseItem {
  id: string;
  anonymous_alias: string | null;
  avatar_url: string | null;
  status: string;
  case_type: string;
  student_id: string;
  opened_at: string;
}

interface ChatCaseListProps {
  cases: CaseItem[];
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("es-CO", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return "—";
  }
}

function caseTypeLabel(caseType: string): string {
  if (caseType === "AUTOMATIC_ALERT") return "Alerta automática";
  if (caseType === "SELF_REFERRAL") return "Autoderivación";
  return caseType || "Caso clínico";
}

function statusBadge(status: string): { label: string; className: string } {
  switch (status) {
    case "ASSIGNED":
      return { label: "Asignado", className: "bg-risk-low-bg text-risk-low" };
    case "ACCEPTED":
      return { label: "Aceptado", className: "bg-risk-medium-bg text-risk-medium-text" };
    case "ARCHIVED":
      return { label: "Archivado", className: "bg-muted text-muted" };
    default:
      return { label: status || "Activo", className: "bg-risk-low-bg text-risk-low" };
  }
}

export function ChatCaseList({ cases }: ChatCaseListProps) {
  if (cases.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-8 text-center">
        <p className="text-sm text-muted">No tienes casos activos asignados</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {cases.map((c) => {
        const badge = statusBadge(c.status);
        return (
          <Link
            key={c.id}
            href={`/dashboard/chat?caseId=${c.id}`}
            className="bg-surface border border-border rounded-2xl p-4 space-y-3 transition-shadow hover:shadow-sm block cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Avatar
                seed={c.anonymous_alias || c.student_id}
                size={40}
                url={c.avatar_url || undefined}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-foreground truncate">
                    {c.anonymous_alias || `Estudiante #${c.student_id.slice(0, 6)}`}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${badge.className}`}>
                    {badge.label}
                  </span>
                </div>
                <p className="text-xs text-muted mt-0.5">
                  {caseTypeLabel(c.case_type)}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-muted">
              <span>{formatDate(c.opened_at)}</span>
              <span className="flex items-center gap-1">
                <MessageSquare size={12} />
                Chat
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
