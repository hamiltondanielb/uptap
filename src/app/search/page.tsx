import Image from "next/image";
import Link from "next/link";

import {
  addSearchResultToCollectionAction,
  addSearchResultToDeckAction,
  cacheSearchResultAction
} from "@/app/search/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { collectionConditions, collectionFinishes } from "@/lib/collection/service";
import { db } from "@/lib/db/client";
import { collectionItems } from "@/lib/db/schema";
import { deckSections, getDeckSummaries } from "@/lib/decks/service";
import { searchCardPrints } from "@/lib/scryfall/client";

export default async function SearchPage({
  searchParams
}: {
  searchParams?: { q?: string; cached?: string; addedCollection?: string; addedDeck?: string; error?: string };
}) {
  const query = searchParams?.q ?? "";
  const [{ results, error }, decks, ownedPrintRows] = await Promise.all([
    searchCardPrints(query),
    getDeckSummaries(),
    db.selectDistinct({ printId: collectionItems.printId }).from(collectionItems)
  ]);
  const ownedPrintIds = new Set(ownedPrintRows.map((r: { printId: string }) => r.printId));

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Search</p>
          <h2 className="mt-2 font-display text-4xl">Scryfall-backed print lookup</h2>
        </div>
        <form className="w-full max-w-md">
          <Input defaultValue={query} name="q" placeholder="Try Raffine, Arcane Signet, Mondrak..." />
        </form>
      </section>

      {searchParams?.cached === "1" ? (
        <Card className="border-emerald-500/30 bg-emerald-500/10">
          <CardContent className="p-4 text-sm text-emerald-700 dark:text-emerald-400">Search result cached locally.</CardContent>
        </Card>
      ) : null}

      {searchParams?.addedCollection === "1" ? (
        <Card className="border-emerald-500/30 bg-emerald-500/10">
          <CardContent className="p-4 text-sm text-emerald-700 dark:text-emerald-400">Card added to collection.</CardContent>
        </Card>
      ) : null}

      {searchParams?.addedDeck ? (
        <Card className="border-emerald-500/30 bg-emerald-500/10">
          <CardContent className="p-4 text-sm text-emerald-700 dark:text-emerald-400">Card added to the selected deck.</CardContent>
        </Card>
      ) : null}

      {searchParams?.error ? (
        <Card className="border-amber-500/30 bg-amber-500/10">
          <CardContent className="p-4 text-sm text-amber-700 dark:text-amber-400">{decodeURIComponent(searchParams.error)}</CardContent>
        </Card>
      ) : null}

      {error ? (
        <Card>
          <CardHeader>
            <CardTitle>Search unavailable</CardTitle>
            <CardDescription>
              The client is implemented, but this environment currently cannot reach the Scryfall API.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{error}</CardContent>
        </Card>
      ) : null}

      {results.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {results.map((result) => (
            <Card key={result.id} className="overflow-hidden">
              <CardContent className="p-0">
                {/* Card header: thumbnail + info */}
                <div className="flex gap-4 p-4">
                  {result.imageUrl ? (
                    <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-950/95">
                      <Image alt={result.name} className="object-cover object-top" fill sizes="64px" src={result.imageUrl} />
                    </div>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-xl leading-tight">{result.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {result.setName} · {result.set} #{result.collectorNumber}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant="outline">{result.rarity}</Badge>
                      {result.priceUsd ? <Badge variant="outline">${result.priceUsd}</Badge> : null}
                      {result.priceUsdFoil ? <Badge variant="outline">Foil ${result.priceUsdFoil}</Badge> : null}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3 border-t border-border/50 p-4">
                  {/* Add to collection — blocked if already owned */}
                  {ownedPrintIds.has(result.id) ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">In collection</Badge>
                        <span className="text-xs text-muted-foreground">Adjust quantity on the collection page</span>
                      </div>
                      <Link
                        href={`/collection/card/${result.id}`}
                        className="inline-flex h-8 w-full items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                      >
                        View in collection
                      </Link>
                    </div>
                  ) : (
                    <form action={addSearchResultToCollectionAction} className="space-y-2">
                      <input name="query" type="hidden" value={query} />
                      <input name="result" type="hidden" value={JSON.stringify(result)} />
                      <div className="flex flex-wrap items-end gap-2">
                        <label className="space-y-1 text-xs">
                          <span className="text-muted-foreground">Qty</span>
                          <Input className="h-8 w-14 text-sm" defaultValue="1" min="1" name="quantity" type="number" />
                        </label>
                        <label className="space-y-1 text-xs">
                          <span className="text-muted-foreground">Finish</span>
                          <select className="flex h-8 rounded-md border border-input bg-background/80 px-2 py-1 text-sm" defaultValue="nonfoil" name="finish">
                            {collectionFinishes.map((f) => <option key={f} value={f}>{f}</option>)}
                          </select>
                        </label>
                        <label className="space-y-1 text-xs">
                          <span className="text-muted-foreground">Condition</span>
                          <select className="flex h-8 rounded-md border border-input bg-background/80 px-2 py-1 text-sm" defaultValue="near_mint" name="condition">
                            {collectionConditions.map((c) => <option key={c} value={c}>{c.replaceAll("_", " ")}</option>)}
                          </select>
                        </label>
                        <label className="min-w-0 flex-1 space-y-1 text-xs">
                          <span className="text-muted-foreground">Location</span>
                          <Input className="h-8 text-sm" defaultValue="Search Intake" name="location" />
                        </label>
                      </div>
                      <Button size="sm" type="submit" className="w-full">Add to collection</Button>
                    </form>
                  )}

                  {/* Add to deck */}
                  {decks.length > 0 ? (
                    <form action={addSearchResultToDeckAction} className="space-y-2">
                      <input name="query" type="hidden" value={query} />
                      <input name="result" type="hidden" value={JSON.stringify(result)} />
                      <div className="flex flex-wrap items-end gap-2">
                        <label className="min-w-0 flex-1 space-y-1 text-xs">
                          <span className="text-muted-foreground">Deck</span>
                          <select className="flex h-8 w-full rounded-md border border-input bg-background/80 px-2 py-1 text-sm" name="deckId">
                            {decks.map((deck) => <option key={deck.id} value={deck.id}>{deck.name}</option>)}
                          </select>
                        </label>
                        <label className="space-y-1 text-xs">
                          <span className="text-muted-foreground">Section</span>
                          <select className="flex h-8 rounded-md border border-input bg-background/80 px-2 py-1 text-sm" defaultValue="mainboard" name="section">
                            {deckSections.map((s) => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}
                          </select>
                        </label>
                        <label className="space-y-1 text-xs">
                          <span className="text-muted-foreground">Qty</span>
                          <Input className="h-8 w-14 text-sm" defaultValue="1" min="1" name="quantity" type="number" />
                        </label>
                      </div>
                      <Button size="sm" type="submit" variant="outline" className="w-full">Add to deck</Button>
                    </form>
                  ) : null}

                  {/* Cache — secondary action */}
                  <form action={cacheSearchResultAction}>
                    <input name="query" type="hidden" value={query} />
                    <input name="result" type="hidden" value={JSON.stringify(result)} />
                    <button type="submit" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
                      Cache print locally
                    </button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      ) : query ? (
        <Card>
          <CardHeader>
            <CardTitle>No results loaded</CardTitle>
            <CardDescription>Search will populate here when Scryfall responses are available.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Ready for live card search</CardTitle>
            <CardDescription>This page is wired to the typed Scryfall client; use a query once network access is available.</CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
