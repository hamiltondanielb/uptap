"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle({ iconOnly = false }: { iconOnly?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={isDark ? "Light mode" : "Dark mode"}
      className="flex items-center gap-2 rounded-xl p-2.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
      {!iconOnly && <span className="text-sm">{isDark ? "Light mode" : "Dark mode"}</span>}
    </button>
  );
}
