import Image from "next/image";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { notFound } from "next/navigation";

import {
  addDeckEntryAction,
  addDeckPrintToCollectionAction,
  cacheAndSetDeckCommanderFromSearchAction,
  removeDeckEntryAction,
  setDeckCommanderAction,
  setDeckEntryQuantityAction,
  updateDeckEntrySectionAction,
  updateDeckMetaAction,
  updateDeckNotesAction
} from "@/app/decks/actions";
import { CardImagePreview } from "@/components/ui/card-image-preview";
import { DeckActionsMenu } from "@/components/decks/deck-actions-menu";
import { DeckBulkPaste } from "@/components/decks/deck-bulk-paste";
import { DeckEntryMenu } from "@/components/decks/deck-entry-menu";
import { PrintSearchForm } from "@/components/decks/print-search-form";
import { Badge } from "@/components/ui/badge";
import { ManaCost } from "@/components/ui/mana-cost";
import { ManaSymbol } from "@/components/ui/mana-symbol";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { deckFormats, deckSections, getDeckDetail, searchCachedPrints } from "@/lib/decks/service";
import { searchCardPrints } from "@/lib/scryfall/client";
import { cn } from "@/lib/utils";

function prettySection(section: string) {
  return section.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

const TYPE_ORDER = ["Creature", "Planeswalker", "Battle", "Instant", "Sorcery", "Artifact", "Enchantment", "Land"];
const TYPE_PLURAL: Record<string, string> = {
  Creature: "Creatures", Planeswalker: "Planeswalkers", Battle: "Battles",
  Instant: "Instants", Sorcery: "Sorceries", Artifact: "Artifacts",
  Enchantment: "Enchantments", Land: "Lands", Other: "Other",
};

function getPrimaryType(typeLine: string | null | undefined): string {
  if (!typeLine) return "Other";
  for (const t of TYPE_ORDER) if (typeLine.includes(t)) return t;
  return "Other";
}

function groupByType<T extends { typeLine?: string | null; quantity: number }>(entries: T[]) {
  const map = new Map<string, T[]>();
  for (const entry of entries) {
    const type = getPrimaryType(entry.typeLine);
    if (!map.has(type)) map.set(type, []);
    map.get(type)!.push(entry);
  }
  return [...TYPE_ORDER, "Other"]
    .filter((t) => map.has(t))
    .map((t) => ({ type: t, entries: map.get(t)! }));
}


export default async function DeckDetailPage({
  params,
  searchParams
}: {
  params: { deckId: string };
  searchParams?: { q?: string; cq?: string; saved?: string; error?: string; collectionAdded?: string; tab?: string };
}) {
  const detail = await getDeckDetail(params.deckId);
  if (!detail) {
    notFound();
  }

  const activeTab = searchParams?.tab === "notes" ? "notes" : "editor";
  const query = searchParams?.q?.trim() ?? "";
  const commanderQuery = searchParams?.cq?.trim() ?? "";

  const [searchResults, commanderResults, liveCommanderSearch] = await Promise.all([
    query ? searchCachedPrints(query, params.deckId) : Promise.resolve([]),
    commanderQuery ? searchCachedPrints(commanderQuery, params.deckId) : Promise.resolve([]),
    commanderQuery
      ? searchCardPrints(commanderQuery)
      : Promise.resolve({ results: [] as Awaited<ReturnType<typeof searchCardPrints>>["results"], error: undefined })
  ]);
  return (
    <div className="space-y-6">
      {/* Header: title left, commander image right */}
      <section className="flex items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{detail.deck.format}</p>
          <h2 className="mt-2 font-display text-4xl">{detail.deck.name}</h2>
          {detail.deck.format === "Commander" && detail.commander ? (
            <p className="mt-1 text-sm font-medium text-muted-foreground">{detail.commander.name}</p>
          ) : null}

          {/* Stat pills + 3-dot menu */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge variant={detail.summary.shortfall > 0 ? "warning" : "success"}>
              {detail.summary.shortfall > 0 ? `${detail.summary.shortfall} cards short` : "Fully covered"}
            </Badge>
            <Badge variant="outline">{detail.summary.totalCards} tracked cards</Badge>
            <Badge variant="outline">{detail.summary.uniquePrints} unique prints</Badge>
            <Badge variant="outline">{detail.analytics.spellCount} spells · {detail.analytics.landCount} lands</Badge>
            {detail.analytics.averageSpellCmc !== null ? (
              <Badge variant="outline">avg CMC {detail.analytics.averageSpellCmc}</Badge>
            ) : null}
            <DeckActionsMenu deckId={detail.deck.id} deckName={detail.deck.name} />
          </div>

          {/* Color identity pills */}
          {detail.analytics.colorBreakdown.length > 0 ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {detail.analytics.colorBreakdown.map((bucket) => (
                <Badge key={bucket.color} variant="outline" className="flex items-center gap-1.5 pr-2.5">
                  <ManaSymbol symbol={bucket.color} size={14} />
                  <span>{bucket.cards}</span>
                </Badge>
              ))}
            </div>
          ) : null}
        </div>

        {/* Commander card image — right side, bigger */}
        {detail.deck.format === "Commander" && detail.commander ? (
          <div className="relative h-52 w-36 shrink-0 overflow-hidden rounded-2xl bg-slate-950/95 shadow-xl">
            <Image
              alt={detail.commander.name}
              className="object-contain"
              fill
              sizes="144px"
              src={(detail.commander.imageNormal ?? detail.commander.imageSmall) ?? ""}
            />
          </div>
        ) : null}
      </section>

      <div className="flex gap-1 rounded-lg border border-border/60 bg-muted p-1 w-fit">
        <Link
          className={cn(
            "inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
            activeTab === "editor" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
          href={`/decks/${detail.deck.id}?tab=editor`}
        >
          Editor
        </Link>
        <Link
          className={cn(
            "inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
            activeTab === "notes" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
          href={`/decks/${detail.deck.id}?tab=notes`}
        >
          Notes
        </Link>
      </div>

      {activeTab === "notes" && searchParams?.saved === "1" ? (
        <Card className="border-emerald-500/30 bg-emerald-500/10">
          <CardContent className="p-4 text-sm text-emerald-700 dark:text-emerald-400">Notes saved.</CardContent>
        </Card>
      ) : null}

      {activeTab === "editor" && searchParams?.saved === "1" ? (
        <Card className="border-emerald-500/30 bg-emerald-500/10">
          <CardContent className="p-4 text-sm text-emerald-700 dark:text-emerald-400">Deck metadata saved.</CardContent>
        </Card>
      ) : null}

      {activeTab === "notes" ? (
        <Card>
          <CardHeader>
            <CardTitle>Play notes</CardTitle>
            <CardDescription>Mulligan strategy, game observations, matchup notes — anything you want to remember about playing this deck.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateDeckNotesAction} className="space-y-4">
              <input name="deckId" type="hidden" value={detail.deck.id} />
              <Textarea
                className="min-h-64 font-mono text-sm"
                defaultValue={detail.deck.notes ?? ""}
                name="notes"
                placeholder="e.g. Keep hands with 3 lands and a 2-drop. Prioritise interaction over threats in game 1..."
              />
              <Button type="submit">Save notes</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {searchParams?.error ? (
        <Card className="border-amber-500/30 bg-amber-500/10">
          <CardContent className="p-4 text-sm text-amber-700 dark:text-amber-400">{decodeURIComponent(searchParams.error)}</CardContent>
        </Card>
      ) : null}

      {activeTab === "editor" ? (
        <>
          {searchParams?.collectionAdded === "1" ? (
            <Card className="border-emerald-500/30 bg-emerald-500/10">
              <CardContent className="p-4 text-sm text-emerald-700 dark:text-emerald-400">Card added to the collection with default details.</CardContent>
            </Card>
          ) : null}

          {/* Deck editor */}
          <section className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Deck editor</CardTitle>
                <CardDescription>Every entry can be moved, resized, or removed without leaving the page.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {detail.groupedEntries.map((group) =>
                  group.entries.length > 0 ? (
                    <details key={group.section} className="group/section" open>
                      {/* Section header */}
                      <summary className="flex cursor-pointer list-none items-center justify-between border-b border-border/50 bg-muted/30 px-6 py-3 [&::-webkit-details-marker]:hidden">
                        <div className="flex items-center gap-2">
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-open/section:rotate-180" />
                          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground">{prettySection(group.section)}</h3>
                        </div>
                        <Badge variant="outline">
                          {group.entries.reduce((sum, entry) => sum + entry.quantity, 0)} cards
                        </Badge>
                      </summary>

                      {/* Entries grouped by card type */}
                      {groupByType(group.entries).map(({ type, entries: typeEntries }) => (
                        <div key={type}>
                          {/* Type sub-header */}
                          <div className="flex items-center gap-2 border-b border-border/30 px-6 py-1.5">
                            <span className="text-xs font-medium text-muted-foreground">{TYPE_PLURAL[type]}</span>
                            <span className="text-xs text-muted-foreground/60">
                              {typeEntries.reduce((s, e) => s + e.quantity, 0)}
                            </span>
                          </div>

                          {typeEntries.map((entry) => (
                            <div
                              key={entry.id}
                              className="flex items-center gap-3 border-b border-border/20 px-4 py-2.5 last:border-b-0 hover:bg-muted/40"
                            >
                              {/* Card thumbnail with hover preview */}
                              <CardImagePreview imageUrl={entry.imageUrl} name={entry.name}>
                                <div className="relative h-10 w-7 shrink-0 overflow-hidden rounded bg-muted">
                                  {entry.imageUrl ? (
                                    <Image alt={entry.name} className="object-cover object-top" fill sizes="28px" src={entry.imageUrl} />
                                  ) : null}
                                </div>
                              </CardImagePreview>

                              {/* Mana cost — for lands show color identity symbols, for colorless show nothing */}
                              <div className="flex w-20 shrink-0 items-center justify-end gap-0.5">
                                {entry.manaCost ? (
                                  <ManaCost cost={entry.manaCost} size={14} />
                                ) : entry.colors.length > 0 ? (
                                  entry.colors.map((color) => <ManaSymbol key={color} symbol={color} size={14} />)
                                ) : null}
                              </div>

                              {/* Card name + type · set */}
                              {entry.owned > 0 ? (
                                <Link href={`/collection/card/${entry.printId}`} className="group min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium leading-snug group-hover:text-primary group-hover:underline">{entry.name}</p>
                                  <p className="truncate text-xs text-muted-foreground">
                                    {entry.typeLine ?? ""}{entry.typeLine && entry.setCode ? " · " : ""}{entry.setCode} #{entry.collectorNumber}
                                  </p>
                                </Link>
                              ) : (
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium leading-snug">{entry.name}</p>
                                  <p className="truncate text-xs text-muted-foreground">
                                    {entry.typeLine ?? ""}{entry.typeLine && entry.setCode ? " · " : ""}{entry.setCode} #{entry.collectorNumber}
                                  </p>
                                </div>
                              )}

                              {/* Owned / available */}
                              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                                {entry.available}/{entry.owned}
                              </span>

                              {/* Qty */}
                              <span className="w-6 shrink-0 text-right text-sm font-medium tabular-nums">
                                {entry.quantity}×
                              </span>

                              {/* Status */}
                              <Badge variant={entry.shortfall > 0 ? "warning" : "success"} className="shrink-0">
                                {entry.shortfall > 0 ? `${entry.shortfall} short` : "Covered"}
                              </Badge>

                              {/* 3-dot menu */}
                              <DeckEntryMenu
                                deckId={detail.deck.id}
                                entry={entry}
                                sections={[...deckSections]}
                                query={query}
                                commanderQuery={commanderQuery}
                                setQuantityAction={setDeckEntryQuantityAction}
                                moveSectionAction={updateDeckEntrySectionAction}
                                addToCollectionAction={addDeckPrintToCollectionAction}
                                removeAction={removeDeckEntryAction}
                              />
                            </div>
                          ))}
                        </div>
                      ))}
                    </details>
                  ) : null
                )}

                {detail.entries.length === 0 ? (
                  <p className="px-6 py-4 text-sm text-muted-foreground">This deck has no entries yet. Use the Edit section below to start building it.</p>
                ) : null}
              </CardContent>
            </Card>

          </section>

          {/* Deck metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Deck metadata</CardTitle>
              <CardDescription>Format and description for this deck.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={updateDeckMetaAction} className="grid gap-4 lg:grid-cols-[1fr_220px]">
                <input name="deckId" type="hidden" value={detail.deck.id} />
                <input name="commanderPrintId" type="hidden" value={detail.deck.commanderPrintId ?? ""} />
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Deck name</span>
                  <Input defaultValue={detail.deck.name} name="name" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Format</span>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background/80 px-3 py-2 text-sm"
                    defaultValue={detail.deck.format}
                    name="format"
                  >
                    {deckFormats.map((format) => (
                      <option key={format} value={format}>
                        {format}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm lg:col-span-2">
                  <span className="font-medium">Description</span>
                  <Textarea defaultValue={detail.deck.description ?? ""} name="description" />
                </label>
                <div className="lg:col-span-2">
                  <Button type="submit">Save metadata</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Collapsible: Edit tools — stays open when a search query is active */}
          <details id="print-search" className="group rounded-xl border border-border/60 bg-card" open={!!query || !!commanderQuery}>
            <summary className="flex cursor-pointer list-none items-center justify-between p-6 [&::-webkit-details-marker]:hidden">
              <div>
                <p className="text-base font-semibold">Edit</p>
                <p className="text-sm text-muted-foreground">Add cached prints, bulk paste, and commander search</p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="space-y-6 px-6 pb-6">

              {/* Add cached prints */}
              <Card>
                <CardHeader>
                  <CardTitle>Add cached prints</CardTitle>
                  <CardDescription>
                    Search the local print cache and add exact prints into a section. This keeps the editor usable even when
                    network access is unavailable.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <PrintSearchForm deckId={detail.deck.id} defaultValue={query} commanderQuery={commanderQuery} />

                  {searchResults.length > 0 ? (
                    <div className="space-y-3">
                      {searchResults.map((result) => (
                        <div key={result.id} className="rounded-2xl border border-border/70 bg-card p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium">{result.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {result.setName} · {result.setCode} #{result.collectorNumber}
                              </p>
                              {result.typeLine ? (
                                <p className="mt-0.5 text-xs text-muted-foreground">{result.typeLine}</p>
                              ) : null}
                              <div className="mt-2 flex flex-wrap gap-2">
                                {result.colors.length > 0 ? (
                                  result.colors.map((color) => (
                                    <ManaSymbol key={color} symbol={color} size={18} />
                                  ))
                                ) : (
                                  <ManaSymbol symbol="C" size={18} />
                                )}
                                <Badge variant={result.available > 0 ? "success" : "warning"}>
                                  {result.available}/{result.owned} available
                                </Badge>
                                {result.quantityInDeck > 0 ? <Badge variant="outline">{result.quantityInDeck} already in deck</Badge> : null}
                              </div>
                            </div>
                            {result.imageUrl ? (
                              <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-950/95">
                                <Image alt={result.name} className="object-contain" fill sizes="64px" src={result.imageUrl} />
                              </div>
                            ) : null}
                          </div>

                          <form action={addDeckEntryAction} className="mt-4 grid gap-3 md:grid-cols-[1fr_120px_120px_auto]">
                            <input name="deckId" type="hidden" value={detail.deck.id} />
                            <input name="printId" type="hidden" value={result.id} />
                            <input name="query" type="hidden" value={query} />
                            <label className="space-y-2 text-sm">
                              <span className="font-medium">Section</span>
                              <select
                                className="flex h-10 w-full rounded-md border border-input bg-background/80 px-3 py-2 text-sm"
                                defaultValue="mainboard"
                                name="section"
                              >
                                {deckSections.map((section) => (
                                  <option key={section} value={section}>
                                    {prettySection(section)}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="space-y-2 text-sm">
                              <span className="font-medium">Quantity</span>
                              <Input defaultValue="1" min="1" name="quantity" type="number" />
                            </label>
                            <div className="md:col-span-2 md:flex md:items-end">
                              <Button type="submit">Add to deck</Button>
                            </div>
                          </form>
                        </div>
                      ))}
                    </div>
                  ) : query ? (
                    <p className="text-sm text-muted-foreground">No cached prints matched that query yet.</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Search results will appear here.</p>
                  )}
                </CardContent>
              </Card>

              <DeckBulkPaste deckId={detail.deck.id} defaultExpanded={false} sections={[...deckSections]} />

              {/* Commander search */}
              <Card>
                <CardHeader>
                  <CardTitle>Commander search</CardTitle>
                  <CardDescription>Cached matches appear first. Live Scryfall results can be cached and set in one action.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form className="flex flex-col gap-3 lg:flex-row">
                    <Input defaultValue={commanderQuery} name="cq" placeholder="Search commander prints" />
                    {query ? <input name="q" type="hidden" value={query} /> : null}
                    <Button type="submit" variant="outline">
                      Search commander
                    </Button>
                  </form>

                  {commanderResults.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Cached</Badge>
                        <p className="text-sm text-muted-foreground">Fast local matches already available in the app.</p>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {commanderResults.map((result) => (
                          <div key={result.id} className="rounded-2xl border border-border/70 bg-card p-4">
                            <p className="font-medium">{result.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {result.setName} · {result.setCode} #{result.collectorNumber}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {result.colors.length > 0 ? (
                                result.colors.map((color) => (
                                  <ManaSymbol key={color} symbol={color} size={18} />
                                ))
                              ) : (
                                <ManaSymbol symbol="C" size={18} />
                              )}
                            </div>
                            <form action={setDeckCommanderAction} className="mt-4">
                              <input name="deckId" type="hidden" value={detail.deck.id} />
                              <input name="commanderPrintId" type="hidden" value={result.id} />
                              <input name="query" type="hidden" value={commanderQuery} />
                              <Button type="submit" variant="outline">
                                Set cached commander
                              </Button>
                            </form>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {liveCommanderSearch.results.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Live Scryfall</Badge>
                        <p className="text-sm text-muted-foreground">Choose one to cache it locally and set it immediately.</p>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {liveCommanderSearch.results.map((result) => (
                          <div key={result.id} className="rounded-2xl border border-border/70 bg-card p-4">
                            <p className="font-medium">{result.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {result.setName} · {result.set} #{result.collectorNumber}
                            </p>
                            <form action={cacheAndSetDeckCommanderFromSearchAction} className="mt-4">
                              <input name="deckId" type="hidden" value={detail.deck.id} />
                              <input name="query" type="hidden" value={commanderQuery} />
                              <input name="result" type="hidden" value={JSON.stringify(result)} />
                              <Button type="submit" variant="outline">
                                Cache and set commander
                              </Button>
                            </form>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {commanderQuery && commanderResults.length === 0 && liveCommanderSearch.results.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No commander results matched that query.</p>
                  ) : null}

                  {liveCommanderSearch.error ? (
                    <p className="text-sm text-muted-foreground">{liveCommanderSearch.error}</p>
                  ) : null}
                </CardContent>
              </Card>

            </div>
          </details>

        </>
      ) : null}
    </div>
  );
}
