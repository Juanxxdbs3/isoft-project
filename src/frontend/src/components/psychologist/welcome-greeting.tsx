"use client";

import { useEffect, useState } from "react";
import { apiGet } from "../../lib/api";

interface PsychologistProfile {
  nombre: string;
  pseudonimo_institucional: string;
}

export function WelcomeGreeting() {
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    apiGet<PsychologistProfile>("/auth/me", token)
      .then((profile) => {
        setDisplayName(profile.nombre || profile.pseudonimo_institucional || "");
      })
      .catch(() => {});
  }, []);

  const hour = new Date().getHours();
  const greeting =
    hour >= 6 && hour < 12
      ? "Buenos días"
      : hour >= 12 && hour < 19
        ? "Buenas tardes"
        : "Buenas noches";

  return (
    <div>
      <h1 className="text-2xl font-bold font-display text-foreground">
        {greeting}{displayName ? `, ${displayName}` : ""}
      </h1>
      <p className="text-sm text-muted mt-1">
        Monitoreo de bienestar universitario y atención de alertas críticas
      </p>
    </div>
  );
}
