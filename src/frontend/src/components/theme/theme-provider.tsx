"use client";

import { useEffect } from "react";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    try {
      const theme = localStorage.getItem("theme");
      if (theme === "dark" || (!theme && window.matchMedia("(prefers-color-scheme:dark)").matches)) {
        document.documentElement.classList.add("dark");
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  return <>{children}</>;
}
