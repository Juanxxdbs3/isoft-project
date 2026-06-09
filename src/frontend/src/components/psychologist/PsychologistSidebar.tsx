"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronDown, ChevronRight, FolderOpen, MessageSquare } from "lucide-react";

const alertSubItems = [
  { label: "Crítica", filter: "critica", color: "before:bg-red-500" },
  { label: "Media", filter: "media", color: "before:bg-amber-500" },
  { label: "Baja", filter: "baja", color: "before:bg-green-500" },
];

export function PsychologistSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [alertsExpanded, setAlertsExpanded] = useState(false);

  function handleAlertsClick() {
    setAlertsExpanded((prev) => !prev);
    router.push("/dashboard");
  }

  const isAlertsActive = pathname === "/dashboard" || pathname.startsWith("/dashboard/");

  return (
    <aside className="hidden md:flex fixed left-0 top-14 bottom-0 w-56 flex-col bg-sidebar border-r border-border z-20">
      <nav className="flex-1 flex flex-col gap-1 p-3">
        {/* Alertas (expandable parent) */}
        <div>
          <div
            onClick={handleAlertsClick}
            className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-colors ${
              isAlertsActive
                ? "bg-primary/10 text-primary"
                : "text-muted hover:text-foreground hover:bg-surface"
            }`}
          >
            <div className="flex items-center gap-3">
              <Bell size={18} />
              <span>Alertas</span>
            </div>
            {alertsExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>

          {/* Sub-items */}
          {alertsExpanded && (
            <div className="ml-2 mt-1 flex flex-col gap-0.5">
              {alertSubItems.map((item) => (
                <Link
                  key={item.filter}
                  href={`/dashboard?filter=${item.filter}`}
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-medium
                    before:inline-block before:w-1.5 before:h-1.5 before:rounded-full ${item.color}
                    text-muted hover:text-foreground hover:bg-surface/50 transition-colors`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Mis Casos */}
        <Link
          href="/dashboard/cases"
          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            pathname.startsWith("/dashboard/cases")
              ? "bg-primary/10 text-primary"
              : "text-muted hover:text-foreground hover:bg-surface"
          }`}
        >
          <FolderOpen size={18} />
          Mis Casos
        </Link>

        {/* Chat */}
        <Link
          href="/dashboard/chat"
          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            pathname.startsWith("/dashboard/chat")
              ? "bg-primary/10 text-primary"
              : "text-muted hover:text-foreground hover:bg-surface"
          }`}
        >
          <MessageSquare size={18} />
          Chat
        </Link>
      </nav>
    </aside>
  );
}
