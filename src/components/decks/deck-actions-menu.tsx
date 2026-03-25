"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";

import { deleteDeckAction } from "@/app/decks/actions";

export function DeckActionsMenu({ deckId, deckName }: { deckId: string; deckName: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  function handleBlur(e: React.FocusEvent<HTMLDivElement>) {
    if (!ref.current?.contains(e.relatedTarget as Node)) {
      setOpen(false);
    }
  }

  return (
    <div ref={ref} className="relative" onBlur={handleBlur}>
      <button
        className="flex h-8 w-8 items-center justify-center rounded-md border border-border/60 bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        onClick={() => setOpen((v) => !v)}
        aria-label="Deck actions"
        type="button"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-1.5 min-w-[160px] overflow-hidden rounded-xl border border-border/60 bg-card shadow-lg">
          <Link
            href={`/decks/${deckId}/export`}
            className="flex w-full items-center px-4 py-2.5 text-sm text-foreground hover:bg-muted"
            onClick={() => setOpen(false)}
          >
            Export decklist
          </Link>
          <Link
            href={`/decks/${deckId}/export?format=csv`}
            className="flex w-full items-center px-4 py-2.5 text-sm text-foreground hover:bg-muted"
            onClick={() => setOpen(false)}
          >
            Export CSV
          </Link>
          <div className="my-1 border-t border-border/40" />
          <form action={deleteDeckAction} onSubmit={() => setOpen(false)}>
            <input name="deckId" type="hidden" value={deckId} />
            <input name="returnTo" type="hidden" value="detail" />
            <button
              className="flex w-full items-center px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              onClick={(e) => {
                if (!confirm(`Delete ${deckName}? This removes the deck and all of its entries.`)) {
                  e.preventDefault();
                }
                setOpen(false);
              }}
              type="submit"
            >
              Delete deck
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
