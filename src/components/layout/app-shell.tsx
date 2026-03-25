"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Archive, ChevronLeft, ChevronRight, Search, Sparkles, Sword, Upload } from "lucide-react";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/", label: "Overview", icon: Sparkles },
  { href: "/collection", label: "Collection", icon: Archive },
  { href: "/decks", label: "Decks", icon: Sword },
  { href: "/import", label: "Import", icon: Upload },
  { href: "/search", label: "Search", icon: Search }
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem("nav-collapsed") === "true");
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      localStorage.setItem("nav-collapsed", String(!prev));
      return !prev;
    });
  }

  return (
    <div className="flex min-h-screen bg-ink-wash">
      {/* Sidebar — sticky, flush to left edge */}
      <aside
        className={cn(
          "sticky top-0 flex h-screen shrink-0 flex-col rounded-r-[24px] border-r border-white/10 bg-slate-950/90 py-4 text-slate-100 shadow-[2px_0_32px_rgba(8,15,20,0.5)] transition-[width] duration-200",
          collapsed ? "w-14 items-center px-2" : "w-44 px-3"
        )}
      >
        {/* Title */}
        <div className={cn("mb-3 shrink-0", collapsed ? "" : "px-1")}>
          {collapsed ? (
            <span className="text-[9px] font-bold uppercase tracking-widest text-amber-300/60">U</span>
          ) : (
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">Untap</p>
          )}
        </div>

        {/* Nav links — fills remaining space, pushing footer to bottom */}
        <nav className="flex w-full flex-col gap-0.5">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={cn(
                  "flex items-center rounded-xl transition-colors",
                  collapsed ? "justify-center p-2.5" : "gap-2.5 px-2.5 py-2 text-sm",
                  active ? "bg-amber-300 font-medium text-slate-950" : "text-slate-300 hover:bg-white/[0.07] hover:text-white"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        {/* Bottom controls: theme toggle + collapse button */}
        <div className={cn("mt-auto flex pt-4", collapsed ? "flex-col items-center gap-1" : "items-center justify-between")}>
          <ThemeToggle iconOnly={collapsed} />
          <button
            onClick={toggle}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/10 hover:text-slate-200"
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col p-4 lg:p-5">
        <main className="min-h-full flex-1 rounded-[28px] border border-white/30 bg-background p-4 shadow-[0_24px_80px_rgba(65,39,24,0.18)] dark:border-white/10 dark:shadow-[0_24px_80px_rgba(0,0,0,0.45)] lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
