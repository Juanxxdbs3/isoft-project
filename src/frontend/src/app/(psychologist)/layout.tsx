import { ThemeToggle } from "../../components/ui/theme-toggle";
import Link from "next/link";

export default function PsychologistLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="psychologist-theme min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-lg font-bold font-display text-primary">MindBridge</span>
            <nav className="hidden md:flex items-center gap-4 text-sm">
              <Link
                href="/dashboard"
                className="text-muted hover:text-foreground transition-colors font-medium"
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard/chat"
                className="text-muted hover:text-foreground transition-colors font-medium"
              >
                Chat
              </Link>
              <Link
                href="/foro"
                className="text-muted hover:text-foreground transition-colors font-medium"
              >
                Foro
              </Link>
            </nav>
          </div>
          <ThemeToggle />
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
