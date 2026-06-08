"use client";

import { useEffect, useState, FormEvent } from "react";
import {
  Settings,
  User,
  AtSign,
  Shield,
  Palette,
  AlertTriangle,
  LogOut,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { apiGet, apiPatch, ApiError } from "@/lib/api";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";

// ─── Types ───────────────────────────────────────────────────────

interface ProfileData {
  pseudonym: string;
  nombre_completo?: string;
  programa?: string;
  semestre?: number;
  correo_contacto?: string;
}

interface PatchResponse {
  updatedComplementary?: boolean;
  updatedPseudonym?: boolean;
  updatedPassword?: boolean;
}

type Feedback = { type: "success" | "error"; text: string } | null;

// ─── Helpers ─────────────────────────────────────────────────────

function FormFeedback({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  const isSuccess = feedback.type === "success";
  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm mt-3 px-4 py-2.5 rounded-xl border transition-opacity",
        isSuccess
          ? "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-900"
          : "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900",
      )}
    >
      {isSuccess ? <CheckCircle size={16} className="shrink-0" /> : <XCircle size={16} className="shrink-0" />}
      <span>{feedback.text}</span>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // ── Section 1: Datos Complementarios ──
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [programa, setPrograma] = useState("");
  const [semestre, setSemestre] = useState<number | "">("");
  const [correoContacto, setCorreoContacto] = useState("");
  const [savingComp, setSavingComp] = useState(false);
  const [feedbackComp, setFeedbackComp] = useState<Feedback>(null);

  // ── Section 2: Seudónimo ──
  const [pseudonym, setPseudonym] = useState("");
  const [savingPseud, setSavingPseud] = useState(false);
  const [feedbackPseud, setFeedbackPseud] = useState<Feedback>(null);

  // ── Section 3: Seguridad ──
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [feedbackPw, setFeedbackPw] = useState<Feedback>(null);

  // ── Section 5: Zona de Peligro ──
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [feedbackDelete, setFeedbackDelete] = useState<Feedback>(null);

  // ── Fetch profile on mount ──
  useEffect(() => {
    const t = localStorage.getItem("access_token");
    setToken(t);

    if (!t) {
      setLoadingProfile(false);
      return;
    }

    apiGet<ProfileData>("/auth/me", t)
      .then((data) => {
        setNombreCompleto(data.nombre_completo ?? "");
        setPrograma(data.programa ?? "");
        setSemestre(data.semestre ?? "");
        setCorreoContacto(data.correo_contacto ?? "");
        setPseudonym(data.pseudonym || localStorage.getItem("pseudonym") || "");
      })
      .catch(() => {
        setPseudonym(localStorage.getItem("pseudonym") || "");
      })
      .finally(() => setLoadingProfile(false));
  }, []);

  // ── Handlers ──

  async function handleSaveComplementary(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSavingComp(true);
    setFeedbackComp(null);

    try {
      await apiPatch<PatchResponse>(
        "/api/v1/students/me",
        {
          nombre_completo: nombreCompleto || undefined,
          programa: programa || undefined,
          semestre: semestre !== "" ? semestre : undefined,
          correo_contacto: correoContacto || undefined,
        },
        token,
      );
      setFeedbackComp({ type: "success", text: "Datos guardados correctamente." });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Error al guardar. Intenta de nuevo.";
      setFeedbackComp({ type: "error", text: msg });
    } finally {
      setSavingComp(false);
    }
  }

  async function handleSavePseudonym(e: FormEvent) {
    e.preventDefault();
    if (!token) return;

    const trimmed = pseudonym.trim();
    if (trimmed.length < 3 || trimmed.length > 30) {
      setFeedbackPseud({ type: "error", text: "El seudónimo debe tener entre 3 y 30 caracteres." });
      return;
    }

    setSavingPseud(true);
    setFeedbackPseud(null);

    try {
      await apiPatch<PatchResponse>("/api/v1/students/me", { pseudonym: trimmed }, token);
      localStorage.setItem("pseudonym", trimmed);
      setFeedbackPseud({ type: "success", text: "Seudónimo actualizado correctamente." });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Error al guardar. Intenta de nuevo.";
      setFeedbackPseud({ type: "error", text: msg });
    } finally {
      setSavingPseud(false);
    }
  }

  async function handleSavePassword(e: FormEvent) {
    e.preventDefault();
    if (!token) return;

    if (!currentPassword) {
      setFeedbackPw({ type: "error", text: "Debes ingresar tu contraseña actual." });
      return;
    }
    if (newPassword.length < 8) {
      setFeedbackPw({ type: "error", text: "La nueva contraseña debe tener al menos 8 caracteres." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFeedbackPw({ type: "error", text: "Las contraseñas nuevas no coinciden." });
      return;
    }

    setSavingPw(true);
    setFeedbackPw(null);

    try {
      await apiPatch<PatchResponse>("/api/v1/students/me", { password: newPassword }, token);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setFeedbackPw({ type: "success", text: "Contraseña actualizada correctamente." });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Error al guardar. Intenta de nuevo.";
      setFeedbackPw({ type: "error", text: msg });
    } finally {
      setSavingPw(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("role");
    localStorage.removeItem("campus");
    localStorage.removeItem("pseudonym");
    localStorage.removeItem("created_at");
    localStorage.removeItem("avatar_url");
    localStorage.removeItem("theme");
    document.cookie.split(";").forEach((c) => {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/");
    });
    router.push("/");
  }

  async function handleDeleteAccount() {
    if (!token) return;
    setDeletingAccount(true);
    setFeedbackDelete(null);

    try {
      const res = await fetch("/api/v1/students/me", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new ApiError(res.status, json.error || "UNKNOWN_ERROR", json.message || "Error al eliminar la cuenta.");
      }

      handleLogout();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Error al eliminar la cuenta. Intenta de nuevo.";
      setFeedbackDelete({ type: "error", text: msg });
      setDeletingAccount(false);
    }
  }

  // ── Render ──

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Settings size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Configuración</h1>
          <p className="text-sm text-muted">Administra tu cuenta y preferencias</p>
        </div>
      </div>

      {loadingProfile ? (
        <div className="text-sm text-muted text-center py-16">Cargando configuración…</div>
      ) : !token ? (
        <div className="bg-surface border border-border rounded-2xl p-6 text-center">
          <p className="text-sm text-muted">Debes iniciar sesión para ver esta página.</p>
        </div>
      ) : (
        <>
          {/* ───── Section 1: Datos Complementarios ───── */}
          <SectionCard title="Datos Complementarios" icon={User}>
            <form onSubmit={handleSaveComplementary} className="space-y-4">
              <div>
                <Label htmlFor="nombre_completo">Nombre completo</Label>
                <Input
                  id="nombre_completo"
                  type="text"
                  value={nombreCompleto}
                  onChange={(e) => setNombreCompleto(e.target.value)}
                  maxLength={200}
                  placeholder="Tu nombre (opcional)"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="programa">Programa académico</Label>
                  <Input
                    id="programa"
                    type="text"
                    value={programa}
                    onChange={(e) => setPrograma(e.target.value)}
                    maxLength={10}
                    placeholder="Ej: INSO"
                  />
                </div>
                <div>
                  <Label htmlFor="semestre">Semestre</Label>
                  <select
                    id="semestre"
                    value={semestre}
                    onChange={(e) => setSemestre(e.target.value ? Number(e.target.value) : "")}
                    className="w-full px-4 py-2.5 bg-surface border border-input rounded-xl text-foreground
                               placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/40
                               focus:border-primary appearance-none"
                  >
                    <option value="">No especificado</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n}° semestre
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="correo_contacto">Correo de contacto</Label>
                <Input
                  id="correo_contacto"
                  type="email"
                  value={correoContacto}
                  onChange={(e) => setCorreoContacto(e.target.value)}
                  maxLength={200}
                  placeholder="correo@ejemplo.com (opcional)"
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-muted">Estos datos son opcionales y solo visibles para psicólogos si aceptan un caso tuyo.</p>
                <Button type="submit" disabled={savingComp} size="lg">
                  {savingComp ? "Guardando…" : "Guardar"}
                </Button>
              </div>
              <FormFeedback feedback={feedbackComp} />
            </form>
          </SectionCard>

          {/* ───── Section 2: Seudónimo ───── */}
          <SectionCard title="Seudónimo" icon={AtSign}>
            <form onSubmit={handleSavePseudonym} className="space-y-4">
              <div>
                <Label htmlFor="pseudonym">Tu seudónimo en el foro</Label>
                <Input
                  id="pseudonym"
                  type="text"
                  value={pseudonym}
                  onChange={(e) => setPseudonym(e.target.value)}
                  minLength={3}
                  maxLength={30}
                  placeholder="Ej: SolValiente42"
                />
                <p className="text-xs text-muted mt-1.5">Entre 3 y 30 caracteres. Será visible en tus publicaciones.</p>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={savingPseud} size="lg">
                  {savingPseud ? "Guardando…" : "Guardar"}
                </Button>
              </div>
              <FormFeedback feedback={feedbackPseud} />
            </form>
          </SectionCard>

          {/* ───── Section 3: Seguridad ───── */}
          <SectionCard title="Seguridad" icon={Shield}>
            <form onSubmit={handleSavePassword} className="space-y-4">
              <div>
                <Label htmlFor="current_password">Contraseña actual</Label>
                <PasswordInput
                  id="current_password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  show={showCurrentPw}
                  onToggle={() => setShowCurrentPw((v) => !v)}
                  placeholder="Ingresa tu contraseña actual"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="new_password">Nueva contraseña</Label>
                  <PasswordInput
                    id="new_password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    show={showNewPw}
                    onToggle={() => setShowNewPw((v) => !v)}
                    placeholder="Mínimo 8 caracteres"
                  />
                </div>
                <div>
                  <Label htmlFor="confirm_password">Confirmar nueva contraseña</Label>
                  <PasswordInput
                    id="confirm_password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    show={showConfirmPw}
                    onToggle={() => setShowConfirmPw((v) => !v)}
                    placeholder="Repite la nueva contraseña"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={savingPw} size="lg">
                  {savingPw ? "Actualizando…" : "Actualizar contraseña"}
                </Button>
              </div>
              <FormFeedback feedback={feedbackPw} />
            </form>
          </SectionCard>

          {/* ───── Section 4: Apariencia ───── */}
          <SectionCard title="Apariencia" icon={Palette}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Modo oscuro</p>
                <p className="text-xs text-muted">Alterna entre tema claro y oscuro</p>
              </div>
              <ThemeToggle />
            </div>
          </SectionCard>

          {/* ───── Section 5: Zona de Peligro ───── */}
          <div
            className="rounded-2xl border border-red-200 dark:border-red-900 p-6
                         bg-red-50/50 dark:bg-red-950/20"
          >
            <h2 className="flex items-center gap-2 text-lg font-bold font-display text-red-700 dark:text-red-400 mb-4">
              <AlertTriangle size={20} />
              Zona de Peligro
            </h2>

            <div className="space-y-4">
              {/* Logout */}
              <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-white/50 dark:bg-black/20 border border-red-200 dark:border-red-900/50">
                <div>
                  <p className="text-sm font-medium text-foreground">Cerrar sesión</p>
                  <p className="text-xs text-muted">Cierra tu sesión actual en todos los dispositivos</p>
                </div>
                <Button variant="destructive" size="lg" onClick={handleLogout}>
                  <LogOut size={16} />
                  Cerrar Sesión
                </Button>
              </div>

              {/* Delete account */}
              <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-white/50 dark:bg-black/20 border border-red-200 dark:border-red-900/50">
                <div>
                  <p className="text-sm font-medium text-foreground">Eliminar cuenta</p>
                  <p className="text-xs text-muted">
                    Elimina permanentemente tu cuenta y todos tus datos. Esta acción no se puede deshacer.
                  </p>
                </div>

                {!showDeleteConfirm ? (
                  <Button
                    variant="destructive"
                    size="lg"
                    onClick={() => {
                      setShowDeleteConfirm(true);
                      setFeedbackDelete(null);
                    }}
                  >
                    <Trash2 size={16} />
                    Eliminar Cuenta
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="destructive"
                      size="lg"
                      disabled={deletingAccount}
                      onClick={handleDeleteAccount}
                      className="animate-pulse"
                    >
                      {deletingAccount ? "Eliminando…" : "Confirmar"}
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      disabled={deletingAccount}
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>

              <FormFeedback feedback={feedbackDelete} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold font-display text-foreground mb-6">
        <Icon size={20} className="text-primary" />
        {title}
      </h2>
      {children}
    </div>
  );
}

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-foreground mb-1.5">
      {children}
    </label>
  );
}

function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }) {
  return (
    <input
      className={cn(
        "w-full px-4 py-2.5 bg-surface border border-input rounded-xl text-foreground",
        "placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary",
        className,
      )}
      {...props}
    />
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  show,
  onToggle,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  show: boolean;
  onToggle: () => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 pr-11 bg-surface border border-input rounded-xl text-foreground
                   placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/40
                   focus:border-primary"
        autoComplete={id === "current_password" ? "current-password" : id === "new_password" ? "new-password" : "new-password"}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
        aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
        tabIndex={-1}
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
