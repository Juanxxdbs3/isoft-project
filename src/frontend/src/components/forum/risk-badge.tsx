import { AlertTriangle, Shield, Info } from "lucide-react";
import type { NivelRiesgo } from "../../types/domain";

const variants: Record<NivelRiesgo, { bg: string; text: string; icon: typeof Info }> = {
  bajo: { bg: "bg-risk-low-bg", text: "text-risk-low", icon: Shield },
  medio: { bg: "bg-risk-medium-bg", text: "text-risk-medium", icon: Info },
  alto: { bg: "bg-risk-high-bg", text: "text-risk-high", icon: AlertTriangle },
};

interface RiskBadgeProps {
  level: NivelRiesgo;
}

export function RiskBadge({ level }: RiskBadgeProps) {
  const v = variants[level];
  const Icon = v.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${v.bg} ${v.text}`}
    >
      <Icon size={12} />
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  );
}
