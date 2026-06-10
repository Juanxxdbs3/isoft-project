import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PsychologistHeader } from "../../components/psychologist/PsychologistHeader";
import { SidebarLayout } from "../../components/psychologist/SidebarLayout";

export default async function PsychologistLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) redirect("/login");

  return (
    <div className="psychologist-theme min-h-screen bg-background text-foreground">
      <PsychologistHeader />
      <SidebarLayout>{children}</SidebarLayout>
    </div>
  );
}
