"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Archive,
  Settings,
} from "lucide-react";

interface PsychologistSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function PsychologistSidebar({ collapsed, onToggle }: PsychologistSidebarProps) {
  const pathname = usePathname();

  const linkClass = (active: boolean) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
      active
        ? "bg-primary/10 text-primary"
        : "text-muted hover:text-foreground hover:bg-surface"
    } ${collapsed ? "justify-center px-0" : ""}`;

  const disabledClass =
    `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium opacity-50 cursor-not-allowed ${
      collapsed ? "justify-center px-0" : ""
    }`;

  const iconOnly = collapsed ? "mx-auto" : "";

  return (
    <>
      <aside
        className={`hidden md:flex flex-col sticky top-14 h-[calc(100vh-3.5rem)] bg-sidebar border-r border-border z-20 transition-all duration-300 ${
          collapsed ? "w-14" : "w-56"
        }`}
      >
        <nav
          className={`flex-1 flex flex-col gap-1 p-4 overflow-hidden ${
            collapsed ? "items-center" : ""
          }`}
        >
          {/* Dashboard */}
          <Link
            href="/dashboard"
            className={linkClass(pathname === "/dashboard")}
            title="Dashboard"
          >
            <Bell size={18} className={iconOnly} />
            {!collapsed && <span>Dashboard</span>}
          </Link>

          {/* Mis Casos */}
          <Link
            href="/cases"
            className={linkClass(pathname.startsWith("/cases"))}
            title="Mis Casos"
          >
            <FolderOpen size={18} className={iconOnly} />
            {!collapsed && <span>Mis Casos</span>}
          </Link>

          {/* Archivados — disabled */}
          <span className={disabledClass} title="Archivados">
            <Archive size={18} className={iconOnly} />
            {!collapsed && <span>Archivados</span>}
          </span>
        </nav>

        {/* Bottom section: Configuración — disabled */}
        <div className={`p-4 border-t border-border ${collapsed ? "flex justify-center" : ""}`}>
          <span className={disabledClass} title="Configuración">
            <Settings size={18} className={iconOnly} />
            {!collapsed && <span>Configuración</span>}
          </span>
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
