"use client";

import { useEffect, useState } from "react";
import { apiGet } from "../../../lib/api";

interface PsychologistProfile {
  id: string;
  nombre: string;
  correo_institucional: string;
  campus: string;
  shift: string;
  pseudonimo_institucional: string;
}

const statCards = [
  { label: "Alertas en la sede", value: "—", accent: "text-primary" },
  { label: "Alertas hoy", value: "—", accent: "text-amber-600" },
  { label: "Alertas IA (NLP)", value: "—", accent: "text-purple-600" },
  { label: "Mis casos activos", value: "—", accent: "text-emerald-600" },
  { label: "Autoderivaciones", value: "—", accent: "text-cyan-600" },
  { label: "Alertas críticas", value: "—", accent: "text-red-600" },
  { label: "Mensajes sin leer", value: "—", accent: "text-primary" },
];

const riskFilters = [
  { key: "bajo", label: "Bajo", color: "border-green-400 text-green-700 bg-green-50" },
  { key: "medio", label: "Medio", color: "border-amber-400 text-amber-700 bg-amber-50" },
  { key: "critico", label: "Crítico", color: "border-red-400 text-red-700 bg-red-50" },
];

export default function DashboardPage() {
  const [profile, setProfile] = useState<PsychologistProfile | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    apiGet<PsychologistProfile>("/auth/me", token)
      .then(setProfile)
      .catch(() => {});
  }, []);

  const displayName = profile?.nombre || profile?.pseudonimo_institucional || "Psicólogo";

  const hour = new Date().getHours();
  const greeting =
    hour >= 6 && hour < 12
      ? "Buenos días"
      : hour >= 12 && hour < 19
        ? "Buenas tardes"
        : "Buenas noches";

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground">
          {greeting}, {displayName}
        </h1>
        <p className="text-sm text-muted mt-1">
          Monitoreo de bienestar universitario y atención de alertas críticas
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-surface border border-border rounded-2xl p-4 flex flex-col gap-1"
          >
            <span className="text-2xl font-bold font-display text-foreground">{stat.value}</span>
            <span className="text-xs text-muted">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Risk filters */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Filtrar por nivel de riesgo</h2>
        <div className="flex flex-wrap gap-3">
          {riskFilters.map((f) => (
            <button
              key={f.key}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border-2 transition-opacity hover:opacity-80 ${f.color}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Critical alerts section (prioritized) */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
          Alertas Críticas
        </h2>
        <div className="bg-surface border border-red-200 rounded-2xl p-8 text-center">
          <p className="text-sm text-muted">
            No hay alertas críticas pendientes
          </p>
        </div>
      </div>

      {/* Medium / Low alerts columns */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
            Riesgo Medio
          </h2>
          <div className="bg-surface border border-border rounded-2xl p-8 text-center">
            <p className="text-sm text-muted">
              Sin alertas de nivel medio
            </p>
          </div>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            Riesgo Bajo
          </h2>
          <div className="bg-surface border border-border rounded-2xl p-8 text-center">
            <p className="text-sm text-muted">
              Sin alertas de nivel bajo
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
