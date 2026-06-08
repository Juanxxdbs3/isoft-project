"use client";

import { useEffect, useState } from "react";
import { ChatWidget } from "../../../components/chat/chat-widget";
import { apiGet } from "../../../lib/api";

export default function ChatPage() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>("");
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

    async function init() {
      try {
        // Fetch user id and active case info
        const me = await apiGet<{ id: string; caso_formal_activo?: boolean }>(
          "/auth/me",
          token || undefined,
        );
        setUserId(me.id);

        // Fetch active chat room
        const room = await apiGet<{ roomId: string } | null>(
          "/chat/rooms/active",
          token || undefined,
        );
        if (room?.roomId) {
          setRoomId(room.roomId);
        }
      } catch {
        // No active room or auth error — show empty state
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  if (loading) {
    return (
      <p className="text-sm text-muted text-center py-10">Cargando chat…</p>
    );
  }

  if (!roomId) {
    return (
      <p className="text-sm text-muted text-center py-10">
        No tienes un chat activo en este momento.
      </p>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)]">
      <ChatWidget
        roomId={roomId}
        currentUserId={userId}
        currentUserRole="student"
      />
    </div>
  );
}
