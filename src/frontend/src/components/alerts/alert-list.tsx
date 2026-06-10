"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { API_BASE } from "../../lib/api";
import { AlertCard } from "./alert-card";

const SEVERITY: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };

interface AlertItem {
  id: string;
  pseudonym: string;
  risk_level: string;
  status: string;
  is_complementary: boolean;
  trigger_text: string;
  generated_at: string;
  assigned_psychologist_id?: string | null;
}

interface AlertListProps {
  alerts: AlertItem[];
}

function decodeTokenPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1]));
  } catch {
    return null;
  }
}

function sortBySeverity(items: AlertItem[]): AlertItem[] {
  return [...items].sort(
    (a, b) => (SEVERITY[b.risk_level] ?? 0) - (SEVERITY[a.risk_level] ?? 0)
  );
}

function normalizeAlertItem(raw: any): AlertItem {
  const pseudonym =
    typeof raw.pseudonym === "object" && raw.pseudonym !== null
      ? (raw.pseudonym as { texto: string }).texto
      : (raw.pseudonym as string);
  return {
    id: raw.id,
    pseudonym,
    risk_level: raw.risk_level,
    status: raw.status,
    is_complementary: !!raw.is_complementary,
    trigger_text: raw.ai_generated_summary || "",
    generated_at: raw.generated_at,
    assigned_psychologist_id: raw.assigned_psychologist_id || null,
  };
}

function throttle<T extends (...args: any[]) => void>(
  fn: T,
  ms: number,
  opts?: { trailing?: boolean },
): T {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const trailing = opts?.trailing ?? true;

  return ((...args: any[]) => {
    const now = Date.now();
    const remaining = ms - (now - lastCall);

    if (remaining <= 0) {
      lastCall = now;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      fn(...args);
    } else if (trailing && !timeoutId) {
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        fn(...args);
      }, remaining);
    }
  }) as T;
}

export function AlertList({ alerts: initialAlerts }: AlertListProps) {
  const [alerts, setAlerts] = useState<AlertItem[]>(
    initialAlerts.filter((a) => !a.assigned_psychologist_id)
  );
  const [error, setError] = useState<string | null>(null);
  const campusRef = useRef<string>("");
  const psychologistIdRef = useRef<string>("");

  const handleInsert = useCallback(
    throttle(
      async (payload: any) => {
        const newId = payload.new?.id as string;
        const newStatus = payload.new?.status as string;
        if (!newId || newStatus !== "PENDING") return;
        const token = localStorage.getItem("access_token");
        if (!token) return;
        const baseUrl = API_BASE;
        try {
          const res = await fetch(`${baseUrl}/alerts?status=PENDING`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) return;
          const json = await res.json();
          const items: any[] = json.data || [];
          const newItems = items
            .filter((a) => a.status === "PENDING" && !a.assigned_psychologist_id)
            .map(normalizeAlertItem);
          setAlerts((prev) => {
            const existingIds = new Set(prev.map((a) => a.id));
            const added = newItems.filter((a) => !existingIds.has(a.id));
            if (added.length === 0) return prev;
            return sortBySeverity([...prev, ...added]);
          });
        } catch {
          // silently handle fetch error
        }
      },
      2000,
      { trailing: false },
    ),
    [],
  );

  const handleUpdate = useCallback((payload: Record<string, unknown>) => {
    const alert = payload.new as Record<string, unknown>;
    if (alert.status !== "PENDING") {
      setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const jwtPayload = decodeTokenPayload(token);
    const appMeta = jwtPayload?.app_metadata as Record<string, unknown> | undefined;
    const userMeta = jwtPayload?.user_metadata as Record<string, unknown> | undefined;
    const campus = ((appMeta?.campus as string) || (userMeta?.campus as string) || "") as string;
    const psychologistId = (userMeta?.sub || jwtPayload?.sub || "") as string;
    campusRef.current = campus;
    psychologistIdRef.current = psychologistId;

    const makeChannel = () => {
      const ch = supabase.channel("psychologist-alerts");

      const insertOpts: Record<string, string> = {
        event: "INSERT",
        schema: "public",
        table: "alert",
      };
      const updateOpts: Record<string, string> = {
        event: "UPDATE",
        schema: "public",
        table: "alert",
      };

      if (campus) {
        insertOpts.filter = `campus=eq.${campus}`;
        updateOpts.filter = `campus=eq.${campus}`;
      }

      ch.on("postgres_changes" as any, insertOpts, (evt: any) =>
        handleInsert(evt),
      );
      ch.on("postgres_changes" as any, updateOpts, (evt: any) =>
        handleUpdate(evt),
      );
      ch.subscribe((status, err) => {
        console.log("Realtime status:", status);
        console.log("Realtime error:", err);
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setError(`Realtime: ${status}`);
        }
      });

      return ch;
    };

    const channel = makeChannel();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [handleInsert, handleUpdate]);

  if (error) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-8 text-center">
        <p className="text-sm text-muted">{error}</p>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-8 text-center">
        <p className="text-sm text-muted">No hay alertas pendientes</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {alerts.map((alert) => (
        <AlertCard
          key={alert.id}
          id={alert.id}
          pseudonym={alert.pseudonym}
          risk_level={alert.risk_level}
          status={alert.status}
          is_complementary={alert.is_complementary}
          trigger_text={alert.trigger_text}
          generated_at={alert.generated_at}
        />
      ))}
    </div>
  );
}
