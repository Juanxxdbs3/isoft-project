import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { House, User, ClipboardList, Settings } from "lucide-react";
import { ThemeToggle } from "../../components/ui/theme-toggle";
import { UserBadge } from "../../components/ui/user-badge";
import { ChatNavItem } from "../../components/navigation/student-nav-items";

const navItems = [
  { href: "/foro", icon: House, label: "Inicio" },
  { href: "/perfil", icon: User, label: "Mi Perfil" },
  { href: "/perfil?tab=posts", icon: ClipboardList, label: "Mis Publicaciones" },
  { href: "/configuracion", icon: Settings, label: "Configuración" },
];

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) redirect("/login");

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-surface border-b border-border flex items-center justify-between px-4 z-30">
        <Link href="/foro" className="flex items-center gap-2">
          <span className="text-sm font-bold font-display text-foreground tracking-tight">MindBridge</span>
        </Link>
        <div className="flex items-center gap-2">
          <UserBadge />
          <ThemeToggle />
        </div>
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-14 bottom-0 w-56 flex-col bg-sidebar border-r border-border z-20">
        <nav className="flex-1 flex flex-col gap-1 p-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-muted hover:text-foreground hover:bg-surface transition-colors"
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          ))}
          <ChatNavItem />
        </nav>
      </aside>

      {/* Main content */}
      <main className="pt-14 md:pl-56 pb-24 md:pb-6">
        <div className="max-w-4xl mx-auto px-4 py-6">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-border flex items-center justify-around px-2 z-40">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-0.5 text-[10px] text-muted hover:text-foreground transition-colors"
          >
            <item.icon size={20} />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
