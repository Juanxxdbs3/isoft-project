import { cookies } from "next/headers";
import { CaseInfoPanel } from "../../../../components/cases/case-info-panel";
import { StudentDataPanel } from "../../../../components/cases/student-data-panel";
import { CaseActions } from "../../../../components/cases/case-actions";
import { CasePostHistory } from "../../../../components/cases/case-post-history";
import { CaseAlertsList } from "../../../../components/cases/case-alerts-list";
import { CaseChatShell } from "../../../../components/cases/case-chat-shell";

interface CaseDetailResponse {
  id: string;
  anonymous_alias: string | null;
  avatar_url: string | null;
  student_id: string;
  status: string;
  case_type: string;
  opened_at: string;
  updated_at: string;
  adviser_export_status: string;
  student: {
    campus: string;
    student_code: string;
    complementary_data: {
      nombre_completo: string | null;
      programa: string | null;
      semestre: number | null;
      correo_contacto: string | null;
    } | null;
  };
  alerts: Array<{
    id: string;
    risk_level: string;
    status: string;
    generated_at: string;
    is_complementary: boolean;
  }>;
  post_history: Array<{
    id: string;
    text_content: string;
    created_at: string;
  }>;
  chat_room: {
    id: string | null;
    status: string | null;
  };
}

interface CaseDetailPageProps {
  params: Promise<{ caseId: string }>;
}

async function fetchCaseDetail(caseId: string, token: string): Promise<CaseDetailResponse | null> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
  try {
    const res = await fetch(`${baseUrl}/cases/${caseId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data as CaseDetailResponse) || null;
  } catch {
    return null;
  }
}

export default async function CaseDetailPage({ params }: CaseDetailPageProps) {
  const { caseId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-6rem)]">
        <p className="text-sm text-muted">Inicia sesión para acceder al caso</p>
      </div>
    );
  }

  const caseData = await fetchCaseDetail(caseId, token);

  if (!caseData) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-6rem)]">
        <p className="text-sm text-muted">Caso no encontrado o no tienes acceso</p>
      </div>
    );
  }

  const studentName = caseData.student?.complementary_data?.nombre_completo
    || caseData.anonymous_alias
    || `Caso #${caseId.slice(0, 8)}`;

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-6rem)] gap-4">
      {/* Left column — case info */}
      <div className="w-full lg:w-96 space-y-4 overflow-y-auto custom-scrollbar shrink-0">
        <CaseInfoPanel
          anonymous_alias={caseData.anonymous_alias}
          avatar_url={caseData.avatar_url}
          student_id={caseData.student_id || ""}
          status={caseData.status}
          case_type={caseData.case_type}
          opened_at={caseData.opened_at}
          updated_at={caseData.updated_at}
          adviser_export_status={caseData.adviser_export_status}
        />

        <StudentDataPanel
          campus={caseData.student?.campus || ""}
          student_code={caseData.student?.student_code || ""}
          complementary_data={caseData.student?.complementary_data || null}
        />

        <CaseActions />

        <CasePostHistory posts={caseData.post_history || []} />

        <CaseAlertsList alerts={caseData.alerts || []} />
      </div>

      {/* Right column — chat */}
      <div className="flex-1 min-h-0">
        <CaseChatShell
          caseId={caseId}
          chatRoom={caseData.chat_room || { id: null, status: null }}
          studentName={studentName}
          studentAvatarUrl={caseData.avatar_url || undefined}
          token={token}
        />
      </div>
    </div>
  );
}
