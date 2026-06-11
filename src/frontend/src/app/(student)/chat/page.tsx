import { cookies } from "next/headers";
import { StudentChatShell } from "../../../components/cases/student-chat-shell";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MeResponse {
  id: string;
  role: "student";
  pseudonym: string | null;
  avatar_url: string | null;
  campus: string;
  caso_formal_activo: boolean;
  active_case_id: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Server-side data fetching
// ---------------------------------------------------------------------------

async function fetchMe(token: string): Promise<MeResponse | null> {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
  try {
    const res = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data as MeResponse) || null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function StudentChatPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  // ── Not authenticated ──
  if (!token) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
        <p className="text-sm text-muted">
          Inicia sesión para acceder al chat
        </p>
      </div>
    );
  }

  // ── Fetch current user info ──
  const me = await fetchMe(token);

  if (!me) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
        <p className="text-sm text-muted">
          No se pudo verificar tu identidad
        </p>
      </div>
    );
  }

  // ── No active clinical case ──
  if (!me.active_case_id) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
        <div className="text-center max-w-sm">
          <p className="text-sm text-muted mb-2">No tienes un caso activo</p>
          <p className="text-xs text-muted/60">
            Para acceder al chat de apoyo, necesitas tener un caso activo
            asignado por el equipo de bienestar universitario.
          </p>
        </div>
      </div>
    );
  }

  // ── Render chat shell ──
  const studentName = me.pseudonym || "Estudiante";
  const avatarUrl = me.avatar_url || undefined;

  return (
    <StudentChatShell
      caseId={me.active_case_id}
      token={token}
      studentName={studentName}
      studentAvatarUrl={avatarUrl}
    />
  );
}
