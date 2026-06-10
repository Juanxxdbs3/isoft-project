import { cookies } from "next/headers";
import { notFound } from "next/navigation";
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

async function getAlertDetail(alertId: string, token: string): Promise<AlertDetailResponse | null> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
  try {
    const res = await fetch(`${baseUrl}/alerts/${alertId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch {
    return null;
  }
}

export default async function AlertDetailPage({ params }: { params: Promise<{ alertId: string }> }) {
  const { alertId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) return null;

  const alert = await getAlertDetail(alertId, token);
  if (!alert) notFound();

  return (
    <div className="max-w-3xl mx-auto">
      <AlertDetailPanel alert={alert} />
    </div>
  );
}
