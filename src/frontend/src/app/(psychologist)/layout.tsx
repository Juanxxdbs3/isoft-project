import { ThemeToggle } from "../../components/ui/theme-toggle";

export default function PsychologistLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="text-lg font-bold font-display text-primary">MindBridge</span>
          <ThemeToggle />
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </>
  );
}
