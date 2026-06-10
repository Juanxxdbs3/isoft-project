import { cookies } from "next/headers";
import Link from "next/link";
import { AlertDetailPanel } from "../../../../../components/alerts/alert-detail-panel";

interface AlertDetailResponse {
  id: string;
  risk_level: string;
  status: string;
  generated_at: string;
  campus: string;
  is_complementary: boolean;
  ai_generated_summary: string | null;
  pseudonym: string;
  avatar_url: string | null;
  deanonymized_data: {
    student_code: string;
    nombre_completo: string | null;
    programa: string | null;
    semestre: number | null;
    correo_contacto: string | null;
  } | null;
  post_history: {
    id: string;
    text_content: string;
    created_at: string;
  }[];
  nlp_detail: {
    id: string;
    depressive_probability: number | null;
    anxiety_probability: number | null;
    suicidal_probability: number | null;
    base_malaise_index: number | null;
    suicidal_override: boolean;
    risk_level: string;
    analyzed_at: string;
  } | null;
}

async function getAlertDetail(alertId: string, token: string): Promise<{ data: AlertDetailResponse | null; status: number }> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
  try {
    const res = await fetch(`${baseUrl}/alerts/${alertId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.status === 404) return { data: null, status: 404 };
    if (res.status === 403) return { data: null, status: 403 };
    if (!res.ok) return { data: null, status: res.status };
    const json = await res.json();
    return { data: json.data || null, status: 200 };
  } catch {
    return { data: null, status: 500 };
  }
}

export default async function AlertDetailPage({ params }: { params: Promise<{ alertId: string }> }) {
  const { alertId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) return null;

  const { data: alert, status } = await getAlertDetail(alertId, token);

  if (status === 403) {
    return (
      <div className="max-w-lg mx-auto mt-12">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center space-y-3">
          <h2 className="text-lg font-semibold text-amber-800">Alerta no disponible</h2>
          <p className="text-sm text-amber-700">
            Esta alerta ya ha sido asignada y está siendo atendida por otro especialista de salud mental.
          </p>
          <Link
            href="/dashboard"
            className="inline-block mt-2 px-4 py-2 rounded-xl text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors"
          >
            Volver al dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!alert) {
    return (
      <div className="max-w-lg mx-auto mt-12">
        <div className="bg-surface border border-border rounded-2xl p-6 text-center space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Alerta no encontrada</h2>
          <p className="text-sm text-muted">
            La alerta que buscas no existe o ha sido eliminada.
          </p>
          <Link
            href="/dashboard"
            className="inline-block mt-2 px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-colors"
          >
            Volver al dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <AlertDetailPanel alert={alert} />
    </div>
  );
}
