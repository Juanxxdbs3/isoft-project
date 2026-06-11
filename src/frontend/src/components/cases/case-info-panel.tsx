import { Avatar } from "../ui/avatar";
import { formatDate } from "../../lib/format-date";
import {
  caseStatusTranslation,
  caseTypeTranslation,
  adviserExportStatusTranslation,
} from "../../lib/i18n/risk";

const statusStyles: Record<string, string> = {
  ASSIGNED: "bg-risk-low-bg text-risk-low",
  OPENED: "bg-risk-medium-bg text-risk-medium",
  ARCHIVED: "bg-muted text-muted",
  RESOLVED: "bg-emerald-100 text-emerald-700",
};

interface CaseInfoPanelProps {
  anonymous_alias: string | null;
  avatar_url: string | null;
  student_id: string;
  status: string;
  case_type: string;
  opened_at: string;
  updated_at: string;
  adviser_export_status: string;
}

export function CaseInfoPanel({
  anonymous_alias,
  avatar_url,
  student_id,
  status,
  case_type,
  opened_at,
  updated_at,
  adviser_export_status,
}: CaseInfoPanelProps) {
  const statusLabel = caseStatusTranslation[status] || status || "Activo";
  const statusClass = statusStyles[status] || "bg-risk-low-bg text-risk-low";
  const typeLabel = caseTypeTranslation[case_type] || case_type || "Caso clínico";
  const exportLabel = adviserExportStatusTranslation[adviser_export_status] || adviser_export_status;

  return (
    <div className="bg-surface border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Avatar
          seed={anonymous_alias || student_id}
          size={44}
          url={avatar_url || undefined}
        />
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold font-display text-foreground truncate">
            {anonymous_alias || (student_id ? `Estudiante #${student_id.slice(0, 6)}` : "Estudiante")}
          </h2>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusClass}`}>
            {statusLabel}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-muted">Tipo</span>
          <p className="text-foreground font-medium">{typeLabel}</p>
        </div>
        <div>
          <span className="text-muted">Exportación</span>
          <p className="text-foreground font-medium">{exportLabel}</p>
        </div>
        <div>
          <span className="text-muted">Apertura</span>
          <p className="text-foreground font-medium">{formatDate(opened_at)}</p>
        </div>
        <div>
          <span className="text-muted">Última actualización</span>
          <p className="text-foreground font-medium">{formatDate(updated_at || opened_at)}</p>
        </div>
      </div>
    </div>
  );
}
