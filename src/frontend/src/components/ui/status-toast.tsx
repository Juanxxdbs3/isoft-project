"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle, AlertTriangle, X } from "lucide-react";

type ToastVariant = "info" | "loading" | "success" | "error";

interface StatusToastProps {
  message: string | null;
  variant?: ToastVariant;
  autoHide?: number;
  onDismiss?: () => void;
}

const variantStyles: Record<ToastVariant, string> = {
  info: "bg-surface border border-border text-foreground",
  loading: "bg-surface border border-border text-foreground",
  success: "bg-emerald-50 border border-emerald-200 text-emerald-800",
  error: "bg-red-50 border border-red-200 text-red-800",
};

const variantIcons: Record<ToastVariant, React.ReactNode> = {
  info: <AlertTriangle size={16} />,
  loading: <Loader2 size={16} className="animate-spin" />,
  success: <CheckCircle2 size={16} />,
  error: <XCircle size={16} />,
};

export function StatusToast({
  message,
  variant = "info",
  autoHide = 0,
  onDismiss,
}: StatusToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      if (autoHide > 0) {
        const timer = setTimeout(() => {
          setVisible(false);
          onDismiss?.();
        }, autoHide);
        return () => clearTimeout(timer);
      }
    } else {
      setVisible(false);
    }
  }, [message, autoHide, onDismiss]);

  if (!visible || !message) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div
        className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium ${variantStyles[variant]}`}
      >
        {variantIcons[variant]}
        <span>{message}</span>
        {onDismiss && (
          <button
            onClick={() => {
              setVisible(false);
              onDismiss();
            }}
            className="ml-2 text-muted hover:text-foreground transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
