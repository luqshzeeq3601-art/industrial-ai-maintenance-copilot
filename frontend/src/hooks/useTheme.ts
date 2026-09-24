import { useEffect, useState } from "react";

export type ThemePreference = "light" | "dark" | "system";

/** Enforces crisp light theme permanently. */
export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>("light");

  useEffect(() => {
    document.documentElement.dataset.theme = "light";
    document.documentElement.style.colorScheme = "light";
    try {
      localStorage.removeItem("copilot-theme");
    } catch {
      // Storage blocked
    }
  }, []);

  return { preference, setPreference };
}

