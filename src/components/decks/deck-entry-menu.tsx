"use client";

import { useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type OwnedPrinting = { printId: string; setCode: string; collectorNumber: string; quantity: number; usedInDecks: Array<{ deckId: string; deckName: string }> };

type EntryMenuProps = {
  deckId: string;
  entry: {
    id: string;
    printId: string;
    quantity: number;
    section: string;
    owned: number;
    useCollection: boolean;
    ownedPrintings: OwnedPrinting[];
  };
  sections: string[];
  query: string;
  commanderQuery: string;
  setQuantityAction: (data: FormData) => Promise<void>;
  moveSectionAction: (data: FormData) => Promise<void>;
  addToCollectionAction: (data: FormData) => Promise<void>;
  toggleUseCollectionAction: (data: FormData) => Promise<void>;
  removeAction: (data: FormData) => Promise<void>;
};

function prettySection(section: string) {
  return section.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function DeckEntryMenu({
  deckId,
  entry,
  sections,
  query,
  commanderQuery,
  setQuantityAction,
  moveSectionAction,
  addToCollectionAction,
  toggleUseCollectionAction,
  removeAction
}: EntryMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  function handleBlur(e: React.FocusEvent<HTMLDivElement>) {
    if (!ref.current?.contains(e.relatedTarget as Node)) {
      setOpen(false);
    }
  }

  return (
    <div ref={ref} className="relative" onBlur={handleBlur}>
      <button
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        onClick={() => setOpen((v) => !v)}
        aria-label="Entry actions"
        type="button"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-xl border border-border/60 bg-card shadow-lg">
          {/* Owned printings */}
          {entry.ownedPrintings.length > 0 ? (
            <>
              <div className="p-3">
                <p className="mb-1.5 text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">Owned printings</p>
                <div className="space-y-1">
                  {entry.ownedPrintings.map((p) => (
                    <div key={p.printId} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`text-sm ${p.printId === entry.printId ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                          {p.setCode} #{p.collectorNumber}
                        </span>
                        {p.usedInDecks.map((d) => (
                          <span key={d.deckId} className="rounded px-1 text-[10px] bg-primary/10 text-primary shrink-0 truncate max-w-[80px]" title={d.deckName}>{d.deckName}</span>
                        ))}
                      </div>
                      <span className="text-xs tabular-nums text-muted-foreground shrink-0">{p.quantity}×</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-border/40" />
            </>
          ) : null}
          {/* Set quantity */}
          <div className="p-3">
            <p className="mb-1.5 text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">Quantity</p>
            <form
              action={setQuantityAction}
              className="flex items-center gap-2"
              onSubmit={() => setOpen(false)}
            >
              <input name="deckId" type="hidden" value={deckId} />
              <input name="entryId" type="hidden" value={entry.id} />
              <Input
                className="h-8 w-20 text-sm"
                defaultValue={String(entry.quantity)}
                min="0"
                name="quantity"
                type="number"
              />
              <Button size="sm" type="submit" variant="outline">
                Set
              </Button>
            </form>
          </div>

          <div className="border-t border-border/40" />

          {/* Move section */}
          <div className="p-3">
            <p className="mb-1.5 text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">Move to section</p>
            <form
              action={moveSectionAction}
              className="flex items-center gap-2"
              onSubmit={() => setOpen(false)}
            >
              <input name="deckId" type="hidden" value={deckId} />
              <input name="entryId" type="hidden" value={entry.id} />
              <select
                className="flex h-8 flex-1 rounded-md border border-input bg-background/80 px-2 py-1 text-sm"
                defaultValue={entry.section}
                name="section"
              >
                {sections.map((s) => (
                  <option key={s} value={s}>
                    {prettySection(s)}
                  </option>
                ))}
              </select>
              <Button size="sm" type="submit" variant="outline">
                Move
              </Button>
            </form>
          </div>

          {entry.owned === 0 ? (
            <>
              <div className="border-t border-border/40" />
              <div className="p-1">
                <form action={addToCollectionAction} onSubmit={() => setOpen(false)}>
                  <input name="deckId" type="hidden" value={deckId} />
                  <input name="printId" type="hidden" value={entry.printId} />
                  <input name="query" type="hidden" value={query} />
                  <input name="commanderQuery" type="hidden" value={commanderQuery} />
                  <button
                    className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted"
                    type="submit"
                  >
                    Add to collection
                  </button>
                </form>
              </div>
            </>
          ) : null}

          {entry.owned > 0 ? (
            <>
              <div className="border-t border-border/40" />
              <div className="p-1">
                <form action={toggleUseCollectionAction} onSubmit={() => setOpen(false)}>
                  <input name="deckId" type="hidden" value={deckId} />
                  <input name="entryId" type="hidden" value={entry.id} />
                  <input name="useCollection" type="hidden" value={String(!entry.useCollection)} />
                  <button
                    className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted"
                    type="submit"
                  >
                    {entry.useCollection ? "Remove collection claim" : "Use my copy"}
                  </button>
                </form>
              </div>
            </>
          ) : null}

          <div className="border-t border-border/40" />

          {/* Remove */}
          <div className="p-1">
            <form action={removeAction} onSubmit={() => setOpen(false)}>
              <input name="deckId" type="hidden" value={deckId} />
              <input name="entryId" type="hidden" value={entry.id} />
              <button
                className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                type="submit"
              >
                Remove from deck
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
