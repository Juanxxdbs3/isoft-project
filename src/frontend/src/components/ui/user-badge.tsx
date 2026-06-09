"use client";

import { useEffect, useState } from "react";
import { Avatar } from "./avatar";
import { apiGet, ApiError } from "../../lib/api";

export function UserBadge() {
  const [pseudonym, setPseudonym] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const storedPseudonym = localStorage.getItem("pseudonym");
    const storedAvatar = localStorage.getItem("avatar_url");

    if (storedPseudonym) {
      setPseudonym(storedPseudonym);
      if (storedAvatar) setAvatarUrl(storedAvatar);
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) return;

    apiGet<{ pseudonym: string; avatar_url?: string }>("/auth/me", token)
      .then((profile) => {
        const name = profile.pseudonym;
        setPseudonym(name);
        localStorage.setItem("pseudonym", name);
        if (profile.avatar_url) {
          setAvatarUrl(profile.avatar_url);
          localStorage.setItem("avatar_url", profile.avatar_url);
        }
      })
      .catch(() => {});
  }, []);

  // Listen for avatar changes from the AvatarModal
  useEffect(() => {
    function handleAvatarChange(e: CustomEvent) {
      const newUrl = e.detail.avatarUrl;
      setAvatarUrl(newUrl);
      localStorage.setItem("avatar_url", newUrl);
    }
    window.addEventListener("avatar-changed", handleAvatarChange as EventListener);
    return () => window.removeEventListener("avatar-changed", handleAvatarChange as EventListener);
  }, []);

  if (!pseudonym) return null;

  return (
    <div className="flex items-center gap-2">
      <Avatar seed={pseudonym} size={28} url={avatarUrl || undefined} />
      <span className="text-xs font-medium text-foreground">{pseudonym}</span>
    </div>
  );
}
