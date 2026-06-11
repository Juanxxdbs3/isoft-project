import { RiskBadge } from "../forum/risk-badge";
import { formatDateShort } from "../../lib/format-date";
import { riskLevelTranslation } from "../../lib/i18n/risk";
import type { NivelRiesgo } from "../../types/domain";

interface AlertItem {
  id: string;
  risk_level: string;
  status: string;
  generated_at: string;
  is_complementary: boolean;
}

interface CaseAlertsListProps {
  alerts: AlertItem[];
}

export function CaseAlertsList({ alerts }: CaseAlertsListProps) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-foreground mb-2">Alertas del caso</h3>
        <p className="text-xs text-muted">No hay alertas asociadas</p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-2xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">
        Alertas del caso ({alerts.length})
      </h3>
      <div className="space-y-2">
        {alerts.map((alert) => {
          const level = riskLevelTranslation[alert.risk_level] as NivelRiesgo | undefined;
          return (
            <div
              key={alert.id}
              className={`flex items-center justify-between gap-2 text-xs bg-background rounded-xl p-3 ${
                alert.is_complementary ? "opacity-70" : ""
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {level && <RiskBadge level={level} />}
                {alert.is_complementary && (
                  <span className="text-[10px] text-muted uppercase tracking-wider shrink-0">
                    Complementaria
                  </span>
                )}
              </div>
              <span className="text-muted shrink-0">
                {formatDateShort(alert.generated_at)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
