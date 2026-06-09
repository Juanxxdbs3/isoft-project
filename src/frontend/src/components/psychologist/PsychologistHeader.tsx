"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "../ui/theme-toggle";
import { apiGet } from "../../lib/api";

interface PsychologistProfile {
  id: string;
  nombre: string;
  correo_institucional: string;
  campus: string;
  shift: string;
  pseudonimo_institucional: string;
}

export function PsychologistHeader() {
  const [profile, setProfile] = useState<PsychologistProfile | null>(null);
  const [localCampus, setLocalCampus] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    setLocalCampus(localStorage.getItem("campus") || "");
    if (!token) return;
    apiGet<PsychologistProfile>("/auth/me", token)
      .then(setProfile)
      .catch(() => {});
  }, []);

  const displayName =
    profile?.nombre || profile?.pseudonimo_institucional || "Psicólogo";
  const campus = profile?.campus || localCampus;
  const shift = profile?.shift || "";

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="text-lg font-bold font-display text-primary"
          >
            MindBridge
          </Link>
          <nav className="hidden md:flex items-center gap-4 text-sm">
            <Link
              href="/dashboard"
              className="text-muted hover:text-foreground transition-colors font-medium"
            >
              Dashboard
            </Link>
            <Link
              href="/foro"
              className="text-muted hover:text-foreground transition-colors font-medium"
            >
              Foro
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden md:inline text-xs text-muted">
            {displayName}
            {campus && (
              <span className="ml-1 opacity-60">
                ·{" "}
                {campus
                  .replace(/_/g, " ")
                  .toLowerCase()
                  .replace(/\b\w/g, (c) => c.toUpperCase())}
              </span>
            )}
            {shift && (
              <span className="ml-1 opacity-60">
                · {shift === "SHIFT_1" ? "07:00–15:00" : "15:00–22:00"}
              </span>
            )}
          </span>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
