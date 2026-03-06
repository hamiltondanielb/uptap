"use client";

import { Search } from "lucide-react";
import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  collectionDeckFilterModes,
  collectionFilterNeedsDeck,
  type CollectionDeckFilterMode
} from "@/lib/collection/filters";
import { cn } from "@/lib/utils";

type DeckOption = {
  id: string;
  name: string;
};

const deckFilterLabels: Record<CollectionDeckFilterMode, string> = {
  all: "All collection rows",
  in_deck: "In selected deck",
  not_in_deck: "Not in selected deck",
  not_in_any_deck: "Not in any deck"
};

export function CollectionFilters({
  query,
  deckFilterMode,
  deckId,
  decks,
  exportHref,
  clearHref
}: {
  query: string;
  deckFilterMode: CollectionDeckFilterMode;
  deckId: string;
  decks: DeckOption[];
  exportHref: string;
  clearHref: string;
}) {
  const [selectedMode, setSelectedMode] = useState(deckFilterMode);
  const needsDeck = collectionFilterNeedsDeck(selectedMode);
  const hasActiveFilters = query.length > 0 || deckFilterMode !== "all" || deckId.length > 0;

  return (
    <div className="w-full max-w-5xl">
      <form className="space-y-4 rounded-3xl border border-border/70 bg-card/85 p-4 shadow-sm md:p-5">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Find cards</p>
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
            <Input
              className="h-14 rounded-2xl border-border/80 bg-background px-4 pl-12 text-base"
              defaultValue={query}
              name="q"
              placeholder="Search by card name, set, or collector number"
            />
          </label>
          <p className="text-sm text-muted-foreground">Use deck filters below if you want to narrow the list by where a print is used.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,240px)_minmax(0,240px)_auto_auto] md:items-end">
          <label className="space-y-1.5 text-sm">
            <span className="font-medium text-foreground">Deck filter</span>
            <select
              className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              defaultValue={deckFilterMode}
              name="deckFilterMode"
              onChange={(event) => setSelectedMode(event.target.value as CollectionDeckFilterMode)}
            >
              {collectionDeckFilterModes.map((mode) => (
                <option key={mode} value={mode}>
                  {deckFilterLabels[mode]}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="font-medium text-foreground">Deck</span>
            <select
              className={cn(
                "flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm",
                !needsDeck && "cursor-not-allowed opacity-60"
              )}
              defaultValue={deckId}
              disabled={!needsDeck}
              name="deckId"
            >
              <option value="">{decks.length > 0 ? "Choose a deck" : "No decks yet"}</option>
              {decks.map((deck) => (
                <option key={deck.id} value={deck.id}>
                  {deck.name}
                </option>
              ))}
            </select>
          </label>
          <Button className="h-11 rounded-xl px-5" type="submit">
            Apply
          </Button>
          <a className={cn(buttonVariants({ variant: "outline" }), "h-11 rounded-xl px-5")} href={exportHref}>
            Export CSV
          </a>
        </div>

        {hasActiveFilters ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
            <p className="text-sm text-muted-foreground">Filters are narrowing the collection results.</p>
            <a className={cn(buttonVariants({ variant: "ghost" }), "h-9 rounded-xl px-3")} href={clearHref}>
              Clear filters
            </a>
          </div>
        ) : null}
      </form>
    </div>
  );
}
