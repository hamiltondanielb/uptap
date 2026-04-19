"use client";

import { useRef, useState } from "react";
import { Copy, Check, X, MoreHorizontal } from "lucide-react";
import Link from "next/link";

import { deleteDeckAction } from "@/app/decks/actions";
import { Button } from "@/components/ui/button";

export function DeckActionsMenu({ deckId, deckName, buyListText, deckListText }: { deckId: string; deckName: string; buyListText: string; deckListText: string }) {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<"buy" | "deck" | null>(null);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  function handleBlur(e: React.FocusEvent<HTMLDivElement>) {
    if (!ref.current?.contains(e.relatedTarget as Node)) {
      setOpen(false);
    }
  }

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
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
            <button
              className="flex w-full items-center px-4 py-2.5 text-sm text-foreground hover:bg-muted"
              onClick={() => { setOpen(false); setModal("deck"); }}
              type="button"
            >
              Export decklist
            </button>
            <Link
              href={`/decks/${deckId}/export?format=csv`}
              className="flex w-full items-center px-4 py-2.5 text-sm text-foreground hover:bg-muted"
              onClick={() => setOpen(false)}
            >
              Export CSV
            </Link>
            <div className="my-1 border-t border-border/40" />
            <button
              className="flex w-full items-center px-4 py-2.5 text-sm text-foreground hover:bg-muted"
              onClick={() => { setOpen(false); setModal("buy"); }}
              type="button"
            >
              Export buy list
            </button>
            <Link
              href={`/decks/${deckId}/export?format=buy-csv`}
              className="flex w-full items-center px-4 py-2.5 text-sm text-foreground hover:bg-muted"
              onClick={() => setOpen(false)}
            >
              Export buy list (CSV)
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

      {modal ? (() => {
        const isBuy = modal === "buy";
        const title = isBuy ? "Buy list" : "Decklist";
        const text = isBuy ? buyListText : deckListText;
        const emptyMessage = isBuy ? "Nothing to buy — deck is fully covered." : "This deck has no entries yet.";
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={(e) => { if (e.target === e.currentTarget) { setModal(null); setCopied(false); } }}
          >
            <div className="relative w-full max-w-md rounded-2xl border border-border/60 bg-card shadow-xl mx-4">
              <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
                <h2 className="text-base font-semibold">{title}</h2>
                <button
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => { setModal(null); setCopied(false); }}
                  type="button"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                {text ? (
                  <textarea
                    className="w-full rounded-xl border border-border bg-muted/30 px-3 py-3 font-mono text-sm leading-relaxed focus:outline-none resize-none"
                    readOnly
                    rows={Math.min(text.split("\n").length + 1, 16)}
                    value={text}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">{emptyMessage}</p>
                )}
                {text ? (
                  <Button className="w-full gap-2" onClick={() => handleCopy(text)} type="button" variant="outline">
                    {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copied!" : "Copy to clipboard"}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        );
      })() : null}
    </>
  );
}
