import Image from "next/image";

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
import { deckSections, getDeckSummaries } from "@/lib/decks/service";
import { searchCardPrints } from "@/lib/scryfall/client";

export default async function SearchPage({
  searchParams
}: {
  searchParams?: { q?: string; cached?: string; addedCollection?: string; addedDeck?: string; error?: string };
}) {
  const query = searchParams?.q ?? "";
  const [{ results, error }, decks] = await Promise.all([searchCardPrints(query), getDeckSummaries()]);

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
        <Card className="border-emerald-300/70 bg-emerald-50">
          <CardContent className="p-4 text-sm text-emerald-900">Search result cached locally.</CardContent>
        </Card>
      ) : null}

      {searchParams?.addedCollection === "1" ? (
        <Card className="border-emerald-300/70 bg-emerald-50">
          <CardContent className="p-4 text-sm text-emerald-900">Card added to collection.</CardContent>
        </Card>
      ) : null}

      {searchParams?.addedDeck ? (
        <Card className="border-emerald-300/70 bg-emerald-50">
          <CardContent className="p-4 text-sm text-emerald-900">Card added to the selected deck.</CardContent>
        </Card>
      ) : null}

      {searchParams?.error ? (
        <Card className="border-amber-300/70 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-900">{decodeURIComponent(searchParams.error)}</CardContent>
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
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {results.map((result) => (
            <Card key={result.id} className="overflow-hidden">
              <CardContent className="p-0">
                {result.imageUrl ? (
                  <div className="relative h-64 w-full bg-slate-950/95">
                    <Image alt={result.name} className="object-contain" fill sizes="320px" src={result.imageUrl} />
                  </div>
                ) : null}
                <div className="space-y-3 p-5">
                  <div>
                    <p className="font-display text-2xl">{result.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {result.setName} · {result.set} #{result.collectorNumber}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.priceUsd ? <Badge variant="outline">${result.priceUsd}</Badge> : null}
                    {result.priceUsdFoil ? <Badge variant="outline">Foil ${result.priceUsdFoil}</Badge> : null}
                    <Badge variant="outline">{result.rarity}</Badge>
                  </div>
                </div>
                <div className="grid gap-4 border-t border-border/70 p-5">
                  <form action={cacheSearchResultAction}>
                    <input name="query" type="hidden" value={query} />
                    <input name="result" type="hidden" value={JSON.stringify(result)} />
                    <Button type="submit" variant="outline">
                      Cache print locally
                    </Button>
                  </form>

                  <form action={addSearchResultToCollectionAction} className="grid gap-3">
                    <input name="query" type="hidden" value={query} />
                    <input name="result" type="hidden" value={JSON.stringify(result)} />
                    <div className="grid gap-3 md:grid-cols-[90px_130px_170px]">
                      <label className="space-y-1 text-xs">
                        <span className="font-medium uppercase tracking-[0.18em] text-muted-foreground">Qty</span>
                        <Input defaultValue="1" min="1" name="quantity" type="number" />
                      </label>
                      <label className="space-y-1 text-xs">
                        <span className="font-medium uppercase tracking-[0.18em] text-muted-foreground">Finish</span>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background/80 px-3 py-2 text-sm"
                          defaultValue="nonfoil"
                          name="finish"
                        >
                          {collectionFinishes.map((finish) => (
                            <option key={finish} value={finish}>
                              {finish}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-1 text-xs">
                        <span className="font-medium uppercase tracking-[0.18em] text-muted-foreground">Condition</span>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background/80 px-3 py-2 text-sm"
                          defaultValue="near_mint"
                          name="condition"
                        >
                          {collectionConditions.map((condition) => (
                            <option key={condition} value={condition}>
                              {condition.replaceAll("_", " ")}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <label className="space-y-1 text-xs">
                      <span className="font-medium uppercase tracking-[0.18em] text-muted-foreground">Location</span>
                      <Input defaultValue="Search Intake" name="location" />
                    </label>
                    <Button type="submit">Add to collection</Button>
                  </form>

                  <form action={addSearchResultToDeckAction} className="grid gap-3">
                    <input name="query" type="hidden" value={query} />
                    <input name="result" type="hidden" value={JSON.stringify(result)} />
                    <div className="grid gap-3 md:grid-cols-[1fr_140px_100px]">
                      <label className="space-y-1 text-xs">
                        <span className="font-medium uppercase tracking-[0.18em] text-muted-foreground">Deck</span>
                        <select className="flex h-10 w-full rounded-md border border-input bg-background/80 px-3 py-2 text-sm" name="deckId">
                          {decks.map((deck) => (
                            <option key={deck.id} value={deck.id}>
                              {deck.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-1 text-xs">
                        <span className="font-medium uppercase tracking-[0.18em] text-muted-foreground">Section</span>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background/80 px-3 py-2 text-sm"
                          defaultValue="mainboard"
                          name="section"
                        >
                          {deckSections.map((section) => (
                            <option key={section} value={section}>
                              {section.replaceAll("_", " ")}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-1 text-xs">
                        <span className="font-medium uppercase tracking-[0.18em] text-muted-foreground">Qty</span>
                        <Input defaultValue="1" min="1" name="quantity" type="number" />
                      </label>
                    </div>
                    <Button disabled={decks.length === 0} type="submit" variant="outline">
                      {decks.length > 0 ? "Add to deck" : "Create a deck first"}
                    </Button>
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
