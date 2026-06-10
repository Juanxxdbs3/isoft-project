"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  MessageSquare,
  Settings,
  Archive,
} from "lucide-react";

const alertSubItems = [
  { label: "Crítica", filter: "critica", color: "before:bg-red-500" },
  { label: "Media", filter: "media", color: "before:bg-amber-500" },
  { label: "Baja", filter: "baja", color: "before:bg-green-500" },
];

interface PsychologistSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function PsychologistSidebar({ collapsed, onToggle }: PsychologistSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [alertsExpanded, setAlertsExpanded] = useState(false);

  function handleAlertsClick() {
    setAlertsExpanded((prev) => !prev);
    router.push("/dashboard");
  }

  const isAlertsActive =
    pathname === "/dashboard" || pathname.startsWith("/dashboard/");

  const linkClass = (active: boolean) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
      active
        ? "bg-primary/10 text-primary"
        : "text-muted hover:text-foreground hover:bg-surface"
    } ${collapsed ? "justify-center px-0" : ""}`;

  const iconOnly = collapsed ? "mx-auto" : "";

  return (
    <>
      <aside
        className={`hidden md:flex flex-col sticky top-14 h-[calc(100vh-3.5rem)] bg-sidebar border-r border-border z-20 transition-all duration-300 ${
          collapsed ? "w-14" : "w-56"
        }`}
      >
        <nav
          className={`flex-1 flex flex-col gap-1 p-3 pt-4 overflow-hidden ${
            collapsed ? "items-center" : ""
          }`}
        >
          {/* Alertas */}
          <div className={collapsed ? "w-full flex flex-col items-center" : ""}>
            <button
              onClick={handleAlertsClick}
              className={`flex items-center justify-between w-full rounded-xl text-sm font-medium cursor-pointer transition-colors ${
                collapsed
                  ? "p-2.5 justify-center hover:bg-surface text-muted hover:text-foreground"
                  : `px-4 py-2.5 ${
                      isAlertsActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted hover:text-foreground hover:bg-surface"
                    }`
              }`}
              title="Alertas"
            >
              <div className={`flex items-center gap-3 ${collapsed ? "" : ""}`}>
                <Bell size={18} className={iconOnly} />
                {!collapsed && <span>Alertas</span>}
              </div>
              {!collapsed &&
                (alertsExpanded ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                ))}
            </button>

            {!collapsed && alertsExpanded && (
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
            className={linkClass(pathname.startsWith("/dashboard/cases"))}
            title="Mis Casos"
          >
            <FolderOpen size={18} className={iconOnly} />
            {!collapsed && <span>Mis Casos</span>}
          </Link>

          {/* Casos Archivados */}
          <Link
            href="/dashboard/cases?status=ARCHIVED"
            className={linkClass(pathname === "/dashboard/cases?status=ARCHIVED")}
            title="Casos Archivados"
          >
            <Archive size={18} className={iconOnly} />
            {!collapsed && <span>Archivados</span>}
          </Link>

          {/* Chat */}
          <Link
            href="/dashboard/chat"
            className={linkClass(pathname.startsWith("/dashboard/chat"))}
            title="Chat"
          >
            <MessageSquare size={18} className={iconOnly} />
            {!collapsed && <span>Chat</span>}
          </Link>
        </nav>

        {/* Bottom section: Settings */}
        <div className={`p-3 border-t border-border ${collapsed ? "flex justify-center" : ""}`}>
          <Link
            href="/dashboard/settings"
            className={`flex items-center gap-3 rounded-xl text-sm font-medium transition-colors text-muted hover:text-foreground hover:bg-surface ${
              collapsed
                ? "p-2.5 justify-center"
                : "px-4 py-2.5"
            } ${
              pathname === "/dashboard/settings"
                ? "bg-primary/10 text-primary"
                : ""
            }`}
            title="Configuración"
          >
            <Settings size={18} />
            {!collapsed && <span>Configuración</span>}
          </Link>
        </div>
      </aside>

      {/* Toggle button — protuberance on right edge */}
      <button
        onClick={onToggle}
        className="hidden md:flex fixed z-30 items-center justify-center w-6 h-10 rounded-r-xl bg-sidebar border border-l-0 border-border text-muted hover:text-foreground transition-all duration-300 cursor-pointer"
        style={{
          left: collapsed ? "56px" : "224px",
          top: "50vh",
          transform: "translateY(-50%)",
        }}
        aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </>
  );
}
