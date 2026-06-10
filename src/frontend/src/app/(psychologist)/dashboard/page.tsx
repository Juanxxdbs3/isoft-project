import { cookies } from "next/headers";
import { AlertList } from "../../../components/alerts/alert-list";
import { WelcomeGreeting } from "../../../components/psychologist/welcome-greeting";

interface AlertRaw {
  id: string;
  pseudonym: string | { texto: string };
  risk_level: string;
  status: string;
  is_complementary: boolean;
  trigger_text: string;
  generated_at: string;
  created_at: string;
}

interface NormalizedAlert {
  id: string;
  pseudonym: string;
  risk_level: string;
  status: string;
  is_complementary: boolean;
  trigger_text: string;
  generated_at: string;
}

function normalizePseudonym(alert: AlertRaw): NormalizedAlert {
  const pseudonym =
    typeof alert.pseudonym === "object" && alert.pseudonym !== null
      ? (alert.pseudonym as { texto: string }).texto
      : (alert.pseudonym as string);
  return { ...alert, pseudonym };
}

async function getAlerts(token: string): Promise<NormalizedAlert[]> {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
  try {
    const res = await fetch(`${baseUrl}/alerts`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = await res.json();
    const items: AlertRaw[] = json.data || [];
    return items.map(normalizePseudonym);
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const alerts = token ? await getAlerts(token) : [];
  const totalAlerts = alerts.length;

  const todayStr = new Date().toISOString().slice(0, 10);
  const alertasHoy = alerts.filter((a) => a.generated_at?.startsWith(todayStr)).length;
  const alertasCriticas = alerts.filter((a) => a.risk_level === "HIGH").length;

  const statCards = [
    { label: "Alertas en la sede", value: String(totalAlerts), accent: "text-primary" },
    { label: "Alertas hoy", value: String(alertasHoy), accent: "text-amber-600" },
    { label: "Alertas IA (NLP)", value: String(totalAlerts), accent: "text-purple-600" },
    { label: "Mis casos activos", value: "—", accent: "text-emerald-600" },
    { label: "Autoderivaciones", value: "—", accent: "text-cyan-600" },
    { label: "Alertas críticas", value: String(alertasCriticas), accent: "text-red-600" },
    { label: "Mensajes sin leer", value: "—", accent: "text-primary" },
  ];

  const riskFilters = [
    { key: "bajo", label: "Bajo", color: "border-green-400 text-green-700 bg-green-50" },
    { key: "medio", label: "Medio", color: "border-amber-400 text-amber-700 bg-amber-50" },
    { key: "critico", label: "Crítico", color: "border-red-400 text-red-700 bg-red-50" },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <WelcomeGreeting />

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-surface border border-border rounded-2xl p-4 flex flex-col gap-1"
          >
            <span className={`text-2xl font-bold font-display text-foreground ${stat.accent}`}>
              {stat.value}
            </span>
            <span className="text-xs text-muted">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Risk filters */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Filtrar por nivel de riesgo</h2>
        <div className="flex flex-wrap gap-3">
          {riskFilters.map((f) => (
            <button
              key={f.key}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border-2 transition-opacity hover:opacity-80 ${f.color}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alert list */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
          Alertas Activas
        </h2>
        <AlertList alerts={alerts} />
      </div>
    </div>
  );
}
