import { cookies } from "next/headers";
import Link from "next/link";
import { Avatar } from "../../../components/ui/avatar";
import { MessageSquare, ChevronRight } from "lucide-react";
import { API_BASE } from "../../../lib/api";

export const dynamic = "force-dynamic";

interface CaseRaw {
  id: string;
  anonymous_alias: string | null;
  avatar_url: string | null;
  status: string;
  case_type: string;
  student_id: string;
  opened_at: string;
}

async function getMyCases(token: string): Promise<CaseRaw[]> {
  try {
    const res = await fetch(`${API_BASE}/cases`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`[getMyCases] HTTP ${res.status} ${res.statusText}`);
      return [];
    }
    const json = await res.json();
    return (json.data || []).map((c: any) => ({
      id: c.id,
      anonymous_alias: c.anonymous_alias || null,
      avatar_url: c.avatar_url || null,
      status: c.status,
      case_type: c.case_type,
      student_id: c.student_id,
      opened_at: c.opened_at || c.created_at || "",
    }));
  } catch (err) {
    console.error("[getMyCases] Fetch failed:", err);
    return [];
  }
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("es-CO", {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
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
      return { label: "Seguimiento", className: "bg-risk-low-bg text-risk-low" };
    default:
      return { label: status || "Activo", className: "bg-risk-low-bg text-risk-low" };
  }
}

export default async function MyCasesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const cases = token ? await getMyCases(token) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold font-display text-foreground">Mis Casos</h1>
        <p className="text-sm text-muted mt-1">
          Casos asignados en seguimiento activo ({cases.length})
        </p>
      </div>

      {cases.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl p-8 text-center">
          <p className="text-sm text-muted">No tienes casos activos asignados</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cases.map((c) => {
            const badge = statusBadge(c.status);
            return (
              <Link
                key={c.id}
                href={`/cases/${c.id}`}
                className="bg-surface border border-border rounded-2xl p-4 space-y-3 transition-shadow hover:shadow-sm block cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    seed={c.anonymous_alias || c.student_id}
                    size={44}
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
                <p className="text-xs text-muted">
                  {formatDate(c.opened_at)}
                </p>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-primary font-medium">
                    <MessageSquare size={12} />
                    Ir al caso
                  </span>
                  <ChevronRight size={14} className="text-muted" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
