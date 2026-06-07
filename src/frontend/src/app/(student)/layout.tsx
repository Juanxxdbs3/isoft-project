import { ThemeToggle } from "../../components/ui/theme-toggle";
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
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/foro" className="text-lg font-bold font-display text-primary">
            MindBridge
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Bienestar banner */}
      <div className="bg-primary/5 border-b border-primary/10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3 text-sm text-muted overflow-x-auto">
          <span className="shrink-0 text-xs font-semibold text-primary uppercase tracking-wider">
            Próximos eventos
          </span>
          <span className="shrink-0 w-1 h-1 rounded-full bg-muted/50" />
          <span className="shrink-0">Taller de manejo del estrés — 12 jun</span>
          <span className="shrink-0 w-1 h-1 rounded-full bg-muted/50" />
          <span className="shrink-0">Grupo de apoyo semanal — 14 jun</span>
          <span className="shrink-0 w-1 h-1 rounded-full bg-muted/50" />
          <span className="shrink-0">Charla: Salud mental en época de exámenes — 18 jun</span>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-6 pb-24">{children}</main>

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

      {/* Side nav (desktop) */}
      <aside className="fixed left-0 top-14 bottom-0 w-56 border-r border-border bg-surface hidden md:flex flex-col py-6 px-3 gap-1">
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
    </>
  );
}
