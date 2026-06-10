"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { AlertCard } from "./alert-card";

interface AlertItem {
  id: string;
  pseudonym: string;
  risk_level: string;
  status: string;
  is_complementary: boolean;
  trigger_text: string;
  generated_at: string;
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

export function AlertList({ alerts: initialAlerts }: AlertListProps) {
  const [alerts, setAlerts] = useState<AlertItem[]>(initialAlerts);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const payload = decodeTokenPayload(token);
    const campus = (payload?.campus as string) || "";

    if (!campus) return;

    const channel = supabase
      .channel("psychologist-alerts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "alert",
          filter: `campus=eq.${campus}`,
        },
        (payload) => {
          const alert = payload.new as Record<string, unknown>;
          setAlerts((prev) => [
            {
              id: alert.id as string,
              pseudonym: alert.pseudonym as string,
              risk_level: alert.risk_level as string,
              status: alert.status as string,
              is_complementary: !!(alert.is_complementary as boolean),
              trigger_text: alert.trigger_text as string,
              generated_at: alert.generated_at as string,
            },
            ...prev,
          ]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
