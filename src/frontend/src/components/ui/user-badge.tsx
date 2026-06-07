"use client";

import { useEffect, useState } from "react";
import { Avatar } from "./avatar";
import { apiGet, ApiError } from "../../lib/api";

export function UserBadge() {
  const [pseudonym, setPseudonym] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("pseudonym");
    if (stored) {
      setPseudonym(stored);
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) return;

    apiGet<{ pseudonym: string }>("/auth/me", token)
      .then((profile) => {
        const name = profile.pseudonym;
        setPseudonym(name);
        localStorage.setItem("pseudonym", name);
      })
      .catch(() => {});
  }, []);

  if (!pseudonym) return null;

  return (
    <div className="flex items-center gap-2">
      <Avatar seed={pseudonym} size={28} />
      <span className="text-xs font-medium text-foreground">{pseudonym}</span>
    </div>
  );
}
