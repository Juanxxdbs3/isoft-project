"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { apiPost, ApiError } from "../../lib/api";
import { validateStudentCode } from "../../lib/student-code";
import { CAMPUSES } from "../../lib/campus";
import { TermsModal } from "../../components/auth/terms-modal";

interface RegisterResponse {
  student_id: string;
  pseudonym: string;
  campus: string;
}

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    student_code: "",
    password: "",
    confirm_password: "",
    campus: "",
    pseudonym: "",
    accepted_terms: false,
    age_declaration: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showTerms, setShowTerms] = useState(true);

  function updateField<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (form.password !== form.confirm_password) {
      setError("Las contraseñas no coinciden");
      setLoading(false);
      return;
    }

    if (!form.campus) {
      setError("Selecciona tu sede");
      setLoading(false);
      return;
    }

    try {
      const codeError = validateStudentCode(form.student_code);
      if (codeError) {
        setError(codeError);
        setLoading(false);
        return;
      }

      const data = await apiPost<RegisterResponse>("/auth/register", {
        student_code: form.student_code,
        password: form.password,
        campus: form.campus,
        pseudonym: form.pseudonym || undefined,
        accepted_terms: form.accepted_terms,
        terms_version: "v1.0",
        age_declaration: form.age_declaration,
      });

      setSuccess(
        `Registro exitoso. Tu seudónimo es: ${data.pseudonym}. Ahora puedes iniciar sesión.`,
      );
      setTimeout(() => router.push("/login"), 5000);
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

  if (showTerms) {
    return (
      <TermsModal
        onAccept={() => {
          setForm((prev) => ({ ...prev, accepted_terms: true }));
          setShowTerms(false);
        }}
        onDecline={() => {
          window.location.href = "https://google.com";
        }}
      />
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="flex items-center gap-2 justify-center mb-8"
        >
          <Image src="/mindbridge-logo.png" alt="MindBridge" width={32} height={32} className="w-8 h-8" />
          <span className="text-xl font-bold font-display text-primary">MindBridge</span>
        </Link>

        <h1 className="text-2xl font-bold font-display text-foreground text-center mb-2">
          Registrarme
        </h1>
        <p className="text-sm text-muted text-center mb-8">
          Crea tu cuenta anónima en el foro
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Top error banner — visible even when scrolled down */}
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl px-4 py-3 font-medium">
              {error}
            </p>
          )}

          <div>
            <label
              htmlFor="student_code"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Código estudiantil
            </label>
            <input
              id="student_code"
              type="text"
              value={form.student_code}
              onChange={(e) => updateField("student_code", e.target.value)}
              placeholder="Ej: 6882311001"
              required
              className="w-full px-4 py-2.5 bg-surface border border-input rounded-xl text-foreground
                         placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/40
                         focus:border-primary"
            />
          </div>

          <div>
            <label
              htmlFor="pseudonym"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Seudónimo{" "}
              <span className="text-muted font-normal">(opcional)</span>
            </label>
            <input
              id="pseudonym"
              type="text"
              value={form.pseudonym}
              onChange={(e) => updateField("pseudonym", e.target.value)}
              placeholder="Déjalo vacío para generar uno automático"
              maxLength={30}
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
              value={form.password}
              onChange={(e) => updateField("password", e.target.value)}
              placeholder="Mínimo 8 caracteres"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full px-4 py-2.5 bg-surface border border-input rounded-xl text-foreground
                         placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/40
                         focus:border-primary"
            />
          </div>

          <div>
            <label
              htmlFor="confirm_password"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Confirmar contraseña
            </label>
            <input
              id="confirm_password"
              type="password"
              value={form.confirm_password}
              onChange={(e) => updateField("confirm_password", e.target.value)}
              placeholder="Repite la contraseña"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full px-4 py-2.5 bg-surface border border-input rounded-xl text-foreground
                         placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/40
                         focus:border-primary"
            />
          </div>

          <div>
            <label
              htmlFor="campus"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Sede
            </label>
            <select
              id="campus"
              value={form.campus}
              onChange={(e) => updateField("campus", e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-surface border border-input rounded-xl text-foreground
                         focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            >
              <option value="">Selecciona tu sede</option>
              {CAMPUSES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.accepted_terms}
                onChange={(e) =>
                  updateField("accepted_terms", e.target.checked)
                }
                required
                className="mt-0.5 h-4 w-4 rounded border-input text-primary
                           focus:ring-primary/40"
              />
              <span className="text-sm text-muted leading-relaxed">
                Acepto los{" "}
                <Link href="/terminos" className="text-primary underline">
                  términos y condiciones
                </Link>{" "}
                del servicio
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.age_declaration}
                onChange={(e) =>
                  updateField("age_declaration", e.target.checked)
                }
                required
                className="mt-0.5 h-4 w-4 rounded border-input text-primary
                           focus:ring-primary/40"
              />
              <span className="text-sm text-muted leading-relaxed">
                Declaro que tengo 14 años o más
              </span>
            </label>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl px-4 py-2">
              {error}
            </p>
          )}

          {success && (
            <p className="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-900 rounded-xl px-4 py-2">
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary text-white font-semibold rounded-xl
                       hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Registrando…" : "Crear cuenta"}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-muted">
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/login"
            className="text-primary font-medium hover:underline"
          >
            Ingresar
          </Link>
        </p>
      </div>
    </main>
  );
}
