"use client";

import { useState, type ReactNode } from "react";
import { PsychologistSidebar } from "./PsychologistSidebar";

export function SidebarLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex transition-all duration-300">
      <PsychologistSidebar collapsed={collapsed} onToggle={() => setCollapsed((prev) => !prev)} />
      <main
        className={`flex-1 min-h-[calc(100vh-3.5rem)] pt-0 transition-all duration-300 ${
          collapsed ? "pl-20" : "pl-6"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 py-6">{children}</div>
      </main>
    </div>
  );
}
