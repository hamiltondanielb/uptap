import Link from "next/link";
import { Archive, FolderKanban, Search, Sparkles, Sword, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/", label: "Overview", icon: Sparkles },
  { href: "/collection", label: "Collection", icon: Archive },
  { href: "/collection/import", label: "Import", icon: Upload },
  { href: "/decks", label: "Decks", icon: Sword },
  { href: "/search", label: "Search", icon: Search }
] as const;

export function AppShell({ children, pathname }: { children: React.ReactNode; pathname: string }) {
  return (
    <div className="min-h-screen bg-ink-wash">
      <div className="mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 gap-6 px-4 py-5 lg:grid-cols-[260px_1fr] lg:px-6">
        <aside className="rounded-[28px] border border-white/10 bg-slate-950/90 p-6 text-slate-100 shadow-[0_24px_80px_rgba(8,15,20,0.45)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-slate-400">Untap</p>
              <h1 className="mt-2 font-display text-4xl text-white">Card ownership, not guesswork.</h1>
            </div>
            <FolderKanban className="h-8 w-8 text-amber-300" />
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
            <Badge variant="warning" className="w-fit">
              Local-first alpha
            </Badge>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Built around exact prints, real quantities, and deck shortfalls instead of abstract totals.
            </p>
          </div>

          <nav className="mt-8 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-colors",
                    active ? "bg-amber-500/15 text-amber-100" : "text-slate-300 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="rounded-[28px] border border-white/30 bg-[rgba(250,246,239,0.94)] p-4 shadow-[0_24px_80px_rgba(65,39,24,0.18)] lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

