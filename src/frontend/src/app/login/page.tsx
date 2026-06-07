"use client";

import { Suspense, useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiPost, apiGet, ApiError } from "../../lib/api";

interface ProfileResponse {
  pseudonym: string;
  created_at?: string;
  avatar_url?: string | null;
}

type Role = "student" | "psychologist";

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  role: string;
  campus: string;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-muted">Cargando…</div>}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [role, setRole] = useState<Role>(
    (searchParams.get("role") as Role) || "student"
  );
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await apiPost<LoginResponse>("/auth/login", {
        identifier,
        password,
        role,
      });

      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("campus", data.campus);

      // For students, the identifier IS the pseudonym — store it immediately
      if (role === "student") {
        localStorage.setItem("pseudonym", identifier);
      }

      // Fetch real profile (includes created_at, fallback pseudonym)
      try {
        const profile = await apiGet<ProfileResponse>("/auth/me", data.access_token);
        localStorage.setItem("pseudonym", profile.pseudonym);
        if (profile.created_at) {
          localStorage.setItem("created_at", profile.created_at);
        }
        if (profile.avatar_url) {
          localStorage.setItem("avatar_url", profile.avatar_url);
        }
      } catch {
        // Fallback: store today's date so profile doesn't freeze on "Cargando..."
        if (!localStorage.getItem("created_at")) {
          localStorage.setItem("created_at", new Date().toISOString());
        }
      }

      if (data.role === "psychologist") {
        router.push("/dashboard");
      } else {
        router.push("/foro");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Error de conexión. Intenta de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="text-xl font-bold font-display text-primary block text-center mb-8"
        >
          MindBridge
        </Link>

        <h1 className="text-2xl font-bold font-display text-foreground text-center mb-2">
          Ingresar
        </h1>
        <p className="text-sm text-muted text-center mb-8">
          {role === "student"
            ? "Usa tu seudónimo y contraseña"
            : "Usa tu correo institucional"}
        </p>

        {/* Role toggle */}
        <div className="flex bg-surface border border-border rounded-xl p-1 mb-6">
          <button
            type="button"
            onClick={() => setRole("student")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              role === "student"
                ? "bg-primary text-white shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            Estudiante
          </button>
          <button
            type="button"
            onClick={() => setRole("psychologist")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              role === "psychologist"
                ? "bg-primary text-white shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            Psicólogo
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="identifier"
              className="block text-sm font-medium text-foreground mb-1"
            >
              {role === "student" ? "Seudónimo" : "Correo institucional"}
            </label>
            <input
              id="identifier"
              type={role === "student" ? "text" : "email"}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={
                role === "student" ? "Ej: SolValiente42" : "correo@unicartagena.edu.co"
              }
              required
              autoComplete="username"
              className="w-full px-4 py-2.5 bg-surface border border-input rounded-xl text-foreground
                         placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/40
                         focus:border-primary"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="w-full px-4 py-2.5 bg-surface border border-input rounded-xl text-foreground
                         placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/40
                         focus:border-primary"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary text-white font-semibold rounded-xl
                       hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Ingresando…" : "Ingresar"}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-muted">
          ¿No tienes cuenta?{" "}
          <Link href="/registro" className="text-primary font-medium hover:underline">
            Registrarme
          </Link>
        </p>
      </div>
    </main>
  );
}
