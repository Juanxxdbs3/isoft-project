"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { apiGet } from "../../lib/api";

export function ChatNavItem() {
  const pathname = usePathname();
  const [hasActiveCase, setHasActiveCase] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("access_token")
        : null;
    if (!token) {
      setLoading(false);
      return;
    }
    apiGet<{ caso_formal_activo?: boolean }>("/auth/me", token || undefined)
      .then((data) => setHasActiveCase(!!data.caso_formal_activo))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !hasActiveCase) return null;

  const isActive = pathname.startsWith("/chat");
  return (
    <Link
      href="/chat"
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
        isActive
          ? "bg-primary text-white"
          : "text-muted hover:text-foreground hover:bg-surface"
      }`}
    >
      <MessageCircle size={18} />
      Chat de Apoyo
      <span className="ml-auto w-2 h-2 rounded-full bg-green-400 animate-pulse" />
    </Link>
  );
}
