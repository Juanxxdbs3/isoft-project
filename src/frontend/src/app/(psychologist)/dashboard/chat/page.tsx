import { cookies } from "next/headers";
import { ChatCaseList } from "../../../../components/chat/chat-case-list";
import { ChatCaseView } from "../../../../components/chat/chat-case-view";

interface CaseRaw {
  id: string;
  anonymous_alias: string | null;
  avatar_url: string | null;
  status: string;
  case_type: string;
  student_id: string;
  opened_at: string;
}

async function getActiveCases(token: string): Promise<CaseRaw[]> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
  try {
    const res = await fetch(`${baseUrl}/cases?status=ASSIGNED`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
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
  } catch {
    return [];
  }
}

export default async function PsychologistChatPage({
  searchParams,
}: {
  searchParams: Promise<{ caseId?: string }>;
}) {
  const { caseId } = await searchParams;
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-6rem)]">
        <p className="text-sm text-muted">Inicia sesión para acceder al chat</p>
      </div>
    );
  }

  if (caseId) {
    return <ChatCaseView caseId={caseId} token={token} />;
  }

  const cases = await getActiveCases(token);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold font-display text-foreground">Mensajería Clínica</h1>
        <p className="text-sm text-muted mt-1">
          Selecciona un caso para abrir el chat
        </p>
      </div>
      <ChatCaseList cases={cases} />
    </div>
  );
}
