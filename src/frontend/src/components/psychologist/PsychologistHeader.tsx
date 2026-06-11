"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/foro", label: "Foro" },
];

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
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between relative">
        {/* Left: Logo */}
        <div className="flex items-center">
          <Link
            href="/dashboard"
            className="flex items-center gap-2"
          >
            <Image src="/mindbridge-logo.png" alt="MindBridge" width={24} height={24} className="w-6 h-6" />
            <span className="text-lg font-bold font-display text-primary">MindBridge</span>
          </Link>
        </div>

        {/* Center: Navigation — absolutely centered, immune to side content */}
        <nav className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-4 text-sm">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted hover:text-foreground transition-colors font-medium"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right: User info + ThemeToggle */}
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
