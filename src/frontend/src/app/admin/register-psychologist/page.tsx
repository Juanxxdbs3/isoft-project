"use client";

import { useState, FormEvent } from "react";
import { API_BASE } from "../../../lib/api";

const CAMPUS_OPTIONS: Record<string, string> = {
  CLAUSTRO_SAN_AGUSTIN: "Claustro de San Agustín",
  ZARAGOCILLA: "Campus de Zaragocilla",
  PIEDRA_BOLIVAR: "Campus de Piedra de Bolívar",
  CLAUSTRO_LA_MERCED: "Claustro de la Merced",
  CLAUSTRO_SANTO_DOMINGO: "Claustro de Santo Domingo",
  EL_CARMEN_DE_BOLIVAR: "El Carmen de Bolívar",
  MAGANGUE: "Magangué",
  SAN_JUAN_NEPOMUCENO: "San Juan Nepomuceno",
  SANTA_CRUZ_DE_MOMPOS: "Santa Cruz de Mompós",
  CERETE: "Cereté",
  LORICA: "Lorica",
};

const SHIFT_OPTIONS = [
  { value: "SHIFT_1", label: "07:00–15:00" },
  { value: "SHIFT_2", label: "15:00–22:00" },
];

interface ApiErrorResponse {
  error?: string;
  message?: string;
}

type FormStatus = "idle" | "loading" | "success" | "error";

export default function RegisterPsychologistPage() {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [campus, setCampus] = useState("CLAUSTRO_SAN_AGUSTIN");
  const [shift, setShift] = useState("SHIFT_1");
  const [password, setPassword] = useState("");
  const [adminSecret, setAdminSecret] = useState("");

  const [status, setStatus] = useState<FormStatus>("idle");
  const [message, setMessage] = useState("");
  const [psychologistId, setPsychologistId] = useState("");

  function resetForm() {
    setNombre("");
    setCorreo("");
    setCampus("CLAUSTRO_SAN_AGUSTIN");
    setShift("SHIFT_1");
    setPassword("");
    setAdminSecret("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch(`${API_BASE}/admin/psychologists`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Secret": adminSecret,
        },
        body: JSON.stringify({
          nombre,
          correo_institucional: correo,
          campus,
          shift,
          password,
        }),
      });

      const json: ApiErrorResponse & { data?: { psychologist_id: string; campus: string } } =
        await res.json().catch(() => ({}));

      if (res.status === 201 && json.data) {
        setPsychologistId(json.data.psychologist_id);
        setStatus("success");
        setMessage("Psicólogo registrado exitosamente");
        resetForm();
      } else if (res.status === 401) {
        setStatus("error");
        setMessage(json.message || "Clave de administrador incorrecta");
      } else if (res.status === 409) {
        setStatus("error");
        setMessage(json.message || "Este correo institucional ya está registrado");
      } else if (res.status === 422) {
        setStatus("error");
        setMessage(json.message || "Datos de entrada inválidos");
      } else {
        setStatus("error");
        setMessage(json.message || "Error al registrar psicólogo");
      }
    } catch {
      setStatus("error");
      setMessage("Error de conexión. Verifica que el backend esté corriendo.");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-background">
      <div className="w-full max-w-lg">
        <h1 className="text-2xl font-bold font-display text-foreground text-center mb-1">
          Registrar Psicólogo
        </h1>
        <p className="text-sm text-muted text-center mb-8">
          Herramienta interna de aprovisionamiento
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 bg-surface border border-border rounded-2xl p-6">
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-foreground mb-1">
              Nombre completo
            </label>
            <input
              id="nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-background border border-input rounded-xl text-foreground
                         placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
          </div>

          <div>
            <label htmlFor="correo" className="block text-sm font-medium text-foreground mb-1">
              Correo institucional
            </label>
            <input
              id="correo"
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
              placeholder="psicologo@unicartagena.edu.co"
              className="w-full px-4 py-2.5 bg-background border border-input rounded-xl text-foreground
                         placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
          </div>

          <div>
            <label htmlFor="campus" className="block text-sm font-medium text-foreground mb-1">
              Sede
            </label>
            <select
              id="campus"
              value={campus}
              onChange={(e) => setCampus(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-background border border-input rounded-xl text-foreground
                         focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            >
              {Object.entries(CAMPUS_OPTIONS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="shift" className="block text-sm font-medium text-foreground mb-1">
              Turno
            </label>
            <select
              id="shift"
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-background border border-input rounded-xl text-foreground
                         focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            >
              {SHIFT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Mínimo 8 caracteres"
              className="w-full px-4 py-2.5 bg-background border border-input rounded-xl text-foreground
                         placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
          </div>

          <div>
            <label htmlFor="adminSecret" className="block text-sm font-medium text-foreground mb-1">
              Clave de administrador
            </label>
            <input
              id="adminSecret"
              type="password"
              value={adminSecret}
              onChange={(e) => setAdminSecret(e.target.value)}
              required
              placeholder="X-Admin-Secret"
              className="w-full px-4 py-2.5 bg-background border border-input rounded-xl text-foreground
                         placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
          </div>

          {status === "success" && (
            <div className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              ✅ {message}
              <div className="text-xs mt-1 font-mono break-all opacity-80">
                ID: {psychologistId}
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full py-2.5 bg-primary text-white font-semibold rounded-xl
                       hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === "loading" ? "Registrando…" : "Registrar Psicólogo"}
          </button>
        </form>
      </div>
    </main>
  );
}
