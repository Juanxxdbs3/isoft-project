import { ThemeToggle } from "../../components/ui/theme-toggle";
import { UserBadge } from "../../components/ui/user-badge";
import Link from "next/link";
import { House, User, ClipboardList, Settings } from "lucide-react";

const navItems = [
  { href: "/foro", label: "Inicio", icon: House },
  { href: "/perfil", label: "Mi Perfil", icon: User },
  { href: "/perfil?tab=posts", label: "Mis Publicaciones", icon: ClipboardList },
  { href: "/configuracion", label: "Configuración", icon: Settings },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/foro" className="text-lg font-bold font-display text-primary">
            MindBridge
          </Link>
          <div className="flex items-center gap-3">
            <UserBadge />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Side nav (desktop) — fixed to left edge */}
        <aside className="hidden md:flex flex-col fixed left-0 top-14 w-56 min-h-[calc(100vh-3.5rem)] bg-sidebar border-r border-border py-6 px-3 gap-1 z-30">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium
                            text-muted hover:text-foreground hover:bg-primary/5 transition-all"
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 pl-0 md:pl-56">
          <div className="max-w-6xl mx-auto px-4 pt-4 pb-24 md:pb-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Children column */}
              <div className="flex-1 min-w-0">{children}</div>

              {/* Right sidebar — Bienestar card */}
              <aside className="hidden lg:block w-64 shrink-0">
                <div className="sticky top-20 bg-surface border border-border rounded-2xl pl-5 pr-3 py-5 space-y-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-lg">💚</span>
                  </div>
                  <h3 className="text-sm font-bold font-display text-foreground">
                    Bienestar Universitario
                  </h3>
                  <div className="space-y-2 text-xs text-muted">
                    <div className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      <span>Taller de manejo del estrés — 12 jun</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                      <span>Grupo de apoyo semanal — 14 jun</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      <span>Charla: Salud mental en época de exámenes — 18 jun</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted/60 pt-1 border-t border-border">
                    Eventos organizados por el Área de Psicología
                  </p>
                </div>
              </aside>
            </div>
          </div>
        </main>
      </div>

      {/* Bottom nav (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border md:hidden">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-0.5 text-muted hover:text-primary transition-colors"
              >
                <Icon size={20} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
