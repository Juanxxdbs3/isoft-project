"use client";

import { useState, useEffect } from "react";
import { EyeOff, SendHorizonal } from "lucide-react";
import { apiPost, ApiError, apiGet } from "../../lib/api";

interface CreatePostFormProps {
  onPostCreated?: () => void;
}

interface PsychologistProfile {
  participacion_foro_habilitada: boolean;
}

export function CreatePostForm({ onPostCreated }: CreatePostFormProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [isPsychologist, setIsPsychologist] = useState(false);
  const [forumDisabled, setForumDisabled] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("role");
    const isPsy = role === "psychologist";
    setIsPsychologist(isPsy);

    if (isPsy) {
      const token = localStorage.getItem("access_token");
      if (!token) return;
      apiGet<PsychologistProfile>("/auth/me", token)
        .then((profile) => setForumDisabled(!profile.participacion_foro_habilitada))
        .catch(() => {});
    }
  }, []);

  const placeholder = "¿Cómo te sientes hoy?";

  if (forumDisabled) {
    return (
      <div className="w-full bg-surface border border-border rounded-2xl p-5 mb-6 flex items-start gap-3 shadow-sm">
        <div className="shrink-0 mt-0.5 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <EyeOff size={16} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">
            Modo de Monitoreo Clínico
          </p>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            Los profesionales de salud mental visualizan el foro en modo de monitoreo.
            La creación de hilos está reservada para estudiantes.
          </p>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    setSending(true);
    setError("");

    try {
      const token = localStorage.getItem("access_token");
      await apiPost("/forum/posts", { text_content: trimmed }, token || undefined);
      setText("");
      onPostCreated?.();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Error al publicar. Intenta de nuevo.");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full bg-surface border border-border rounded-2xl p-4 mb-6"
    >
      <div className="flex gap-3 items-start">
        <div className="mt-1.5 shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <SendHorizonal size={16} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            rows={2}
            maxLength={500}
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted/50 resize-none focus:outline-none"
          />
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
            <span className="text-xs text-muted">{text.length}/500</span>
            <button
              type="submit"
              disabled={sending || !text.trim()}
              className="px-4 py-1.5 bg-primary text-white text-xs font-semibold rounded-full
                         hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {sending ? "Publicando…" : "Publicar"}
            </button>
          </div>
        </div>
      </div>
      {error && (
        <p className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-1.5">
          {error}
        </p>
      )}
    </form>
  );
}
