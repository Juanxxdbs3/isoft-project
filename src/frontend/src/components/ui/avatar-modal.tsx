"use client";

import { useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { apiPatch, ApiError } from "../../lib/api";

const AVATAR_BASE = process.env.NEXT_PUBLIC_AVATAR_BASE_URL || "https://api.dicebear.com/10.x";
const STYLES = ["open-peeps", "bottts", "avataaars", "identicon", "adventurer", "lorelei", "big-smile", "personas", "notionists", "micah", "croodles", "thumbs"];

interface AvatarModalProps {
  pseudonym: string;
  currentAvatarUrl: string | null;
  onClose: () => void;
  onSaved: (newUrl: string) => void;
}

export function AvatarModal({ pseudonym, currentAvatarUrl, onClose, onSaved }: AvatarModalProps) {
  const [saving, setSaving] = useState<string | null>(null);

  const options = STYLES.map((style, i) => ({
    id: `${style}-${i}`,
    url: `${AVATAR_BASE}/${style}/svg?seed=${encodeURIComponent(pseudonym)}-${i + 1}`,
    label: style.replace(/-/g, " "),
  }));

  async function handleSelect(url: string) {
    if (url === currentAvatarUrl) {
      onClose();
      return;
    }
    setSaving(url);
    try {
      const token = localStorage.getItem("access_token");
      await apiPatch("/forum/profile/avatar", { avatar_url: url }, token || undefined);
      localStorage.setItem("avatar_url", url);
      onSaved(url);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Error al guardar el avatar";
      alert(message);
    } finally {
      setSaving(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">Elige tu avatar</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-border/50 transition-colors"
            aria-label="Cerrar"
          >
            <X size={18} className="text-muted" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {options.map((opt) => {
            const isSelected = opt.url === currentAvatarUrl;
            const isLoading = saving === opt.url;

            return (
              <button
                key={opt.id}
                onClick={() => handleSelect(opt.url)}
                disabled={isLoading}
                className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50 hover:bg-primary/5"
                } ${isLoading ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
              >
                <Image
                  src={opt.url}
                  alt={opt.label}
                  width={56}
                  height={56}
                  className="rounded-full bg-surface"
                  unoptimized
                />
                <span className="text-[10px] text-muted capitalize leading-tight text-center">
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
