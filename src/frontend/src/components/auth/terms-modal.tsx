"use client";
import { TERMS_CONTENT } from "@/lib/terms-content";

interface TermsModalProps {
  onAccept: () => void;
  onDecline: () => void;
}

export function TermsModal({ onAccept, onDecline }: TermsModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            Términos y condiciones de uso
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-6 text-sm text-foreground whitespace-pre-wrap">
          {TERMS_CONTENT}
        </div>
        <div className="p-6 border-t border-border flex gap-3 justify-end">
          <button
            onClick={onDecline}
            className="px-4 py-2 text-sm text-muted hover:text-foreground"
          >
            Rechazar
          </button>
          <button
            onClick={onAccept}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-xl"
          >
            Aceptar y continuar
          </button>
        </div>
      </div>
    </div>
  );
}
