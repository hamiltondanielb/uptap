import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  addDeckEntryAction,
  cacheAndSetDeckCommanderFromSearchAction,
  removeDeckEntryAction,
  setDeckCommanderAction,
  setDeckEntryQuantityAction,
  updateDeckEntrySectionAction,
  updateDeckMetaAction
} from "@/app/decks/actions";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { deckFormats, deckSections, getDeckDetail, searchCachedPrints } from "@/lib/decks/service";
import { searchCardPrints } from "@/lib/scryfall/client";
import { cn } from "@/lib/utils";

function prettySection(section: string) {
  return section.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function manaTone(color: string) {
  switch (color) {
    case "W":
      return "bg-amber-100 text-amber-900";
    case "U":
      return "bg-sky-100 text-sky-900";
    case "B":
      return "bg-slate-800 text-slate-50";
    case "R":
      return "bg-rose-100 text-rose-900";
    case "G":
      return "bg-emerald-100 text-emerald-900";
    default:
      return "bg-stone-200 text-stone-900";
  }
}

export default async function DeckDetailPage({
  params,
  searchParams
}: {
  params: { deckId: string };
  searchParams?: { q?: string; cq?: string; saved?: string; error?: string };
}) {
  const detail = await getDeckDetail(params.deckId);
  if (!detail) {
    notFound();
  }

  const query = searchParams?.q?.trim() ?? "";
  const commanderQuery = searchParams?.cq?.trim() ?? "";

  const [searchResults, commanderResults, liveCommanderSearch] = await Promise.all([
    query ? searchCachedPrints(query, params.deckId) : Promise.resolve([]),
    commanderQuery ? searchCachedPrints(commanderQuery, params.deckId) : Promise.resolve([]),
    commanderQuery
      ? searchCardPrints(commanderQuery)
      : Promise.resolve({ results: [] as Awaited<ReturnType<typeof searchCardPrints>>["results"], error: undefined })
  ]);
  const maxCurveCards = Math.max(...detail.analytics.manaCurve.map((bucket) => bucket.cards), 1);
  const maxColorCards = Math.max(...detail.analytics.colorBreakdown.map((bucket) => bucket.cards), 1);
  const maxPipCount = Math.max(...detail.analytics.manaPips.map((bucket) => bucket.count), 1);

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{detail.deck.format}</p>
          <h2 className="mt-2 font-display text-4xl">{detail.deck.name}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Edit deck metadata, set the commander from cached or live search, and keep availability visible while you tune the list.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Badge variant={detail.summary.shortfall > 0 ? "warning" : "success"}>
            {detail.summary.shortfall > 0 ? `${detail.summary.shortfall} cards short` : "Fully covered"}
          </Badge>
          <Badge variant="outline">{detail.summary.totalCards} tracked cards</Badge>
          <Badge variant="outline">{detail.summary.uniquePrints} unique prints</Badge>
          <Link className={cn(buttonVariants({ variant: "outline" }), "h-8 px-3 text-xs")} href={`/decks/${detail.deck.id}/export`}>
            Export decklist
          </Link>
          <Link
            className={cn(buttonVariants({ variant: "outline" }), "h-8 px-3 text-xs")}
            href={`/decks/${detail.deck.id}/export?format=csv`}
          >
            Export CSV
          </Link>
        </div>
      </section>

      {searchParams?.saved === "1" ? (
        <Card className="border-emerald-300/70 bg-emerald-50">
          <CardContent className="p-4 text-sm text-emerald-900">Deck metadata saved.</CardContent>
        </Card>
      ) : null}

      {searchParams?.error ? (
        <Card className="border-amber-300/70 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-900">{decodeURIComponent(searchParams.error)}</CardContent>
        </Card>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Deck analytics</CardTitle>
            <CardDescription>First-pass metrics from mainboard, sideboard, and commander slots.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Tracked cards</p>
              <p className="mt-2 font-display text-3xl">{detail.analytics.trackedCards}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Average spell CMC</p>
              <p className="mt-2 font-display text-3xl">
                {detail.analytics.averageSpellCmc === null ? "N/A" : detail.analytics.averageSpellCmc}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Spells</p>
              <p className="mt-2 font-display text-3xl">{detail.analytics.spellCount}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Lands</p>
              <p className="mt-2 font-display text-3xl">{detail.analytics.landCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Section totals</CardTitle>
            <CardDescription>Card and print counts per section, including the selected commander slot.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail.analytics.sectionTotals.map((section) => (
              <div key={section.section} className="flex items-center justify-between rounded-2xl border border-border/70 bg-white p-4">
                <div>
                  <p className="font-medium">{prettySection(section.section)}</p>
                  <p className="text-sm text-muted-foreground">{section.uniquePrints} unique prints</p>
                </div>
                <Badge variant="outline">{section.cards} cards</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Mana curve</CardTitle>
            <CardDescription>Weighted by card quantity and excluding lands.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail.analytics.manaCurve.map((bucket) => (
              <div key={bucket.label} className="grid grid-cols-[48px_1fr_48px] items-center gap-3">
                <p className="text-sm font-medium">{bucket.label}</p>
                <div className="h-3 overflow-hidden rounded-full bg-stone-200">
                  <div
                    className="h-full rounded-full bg-stone-900"
                    style={{ width: `${(bucket.cards / maxCurveCards) * 100}%` }}
                  />
                </div>
                <p className="text-right text-sm text-muted-foreground">{bucket.cards}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Color profile</CardTitle>
            <CardDescription>Identity counts plus mana-symbol pressure from tracked nonland spells.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Color identity</p>
              {detail.analytics.colorBreakdown.map((bucket) => (
                <div key={bucket.color} className="grid grid-cols-[28px_1fr_40px] items-center gap-3">
                  <Badge className={manaTone(bucket.color)} variant="outline">
                    {bucket.color}
                  </Badge>
                  <div className="h-3 overflow-hidden rounded-full bg-stone-200">
                    <div
                      className={`h-full rounded-full ${manaTone(bucket.color).split(" ")[0]}`}
                      style={{ width: `${(bucket.cards / maxColorCards) * 100}%` }}
                    />
                  </div>
                  <p className="text-right text-sm text-muted-foreground">{bucket.cards}</p>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Mana symbols</p>
              {detail.analytics.manaPips.map((bucket) => (
                <div key={bucket.color} className="grid grid-cols-[28px_1fr_40px] items-center gap-3">
                  <Badge className={manaTone(bucket.color)} variant="outline">
                    {bucket.color}
                  </Badge>
                  <div className="h-3 overflow-hidden rounded-full bg-stone-200">
                    <div
                      className={`h-full rounded-full ${manaTone(bucket.color).split(" ")[0]}`}
                      style={{ width: `${(bucket.count / maxPipCount) * 100}%` }}
                    />
                  </div>
                  <p className="text-right text-sm text-muted-foreground">{bucket.count}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Deck metadata</CardTitle>
            <CardDescription>Format and description live here. Commander selection now has its own search flow.</CardDescription>
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

        <Card>
          <CardHeader>
            <CardDescription>Commander snapshot</CardDescription>
            <CardTitle>{detail.commander?.name ?? "No commander print selected"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {detail.commander ? (
              <>
                {detail.commander.imageSmall ? (
                  <div className="relative h-56 overflow-hidden rounded-2xl bg-slate-950/95">
                    <Image alt={detail.commander.name} className="object-contain" fill sizes="360px" src={detail.commander.imageSmall} />
                  </div>
                ) : null}
                <p className="text-sm text-muted-foreground">
                  {detail.commander.setName} · {detail.commander.setCode} #{detail.commander.collectorNumber}
                </p>
                <form action={setDeckCommanderAction}>
                  <input name="deckId" type="hidden" value={detail.deck.id} />
                  <input name="commanderPrintId" type="hidden" value="" />
                  <input name="query" type="hidden" value={commanderQuery} />
                  <Button type="submit" variant="outline">
                    Clear commander
                  </Button>
                </form>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Use commander search below to assign an exact commander print from cache or live Scryfall results.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

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
                  <div key={result.id} className="rounded-2xl border border-border/70 bg-white p-4">
                    <p className="font-medium">{result.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {result.setName} · {result.setCode} #{result.collectorNumber}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {result.colors.length > 0 ? (
                        result.colors.map((color) => (
                          <Badge key={color} variant="outline">
                            {color}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="outline">Colorless</Badge>
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
                  <div key={result.id} className="rounded-2xl border border-border/70 bg-white p-4">
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

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>Add cached prints</CardTitle>
            <CardDescription>
              Search the local print cache and add exact prints into a section. This keeps the editor usable even when
              network access is unavailable.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="flex flex-col gap-3 lg:flex-row">
              <Input defaultValue={query} name="q" placeholder="Search cached prints by name, set, or collector number" />
              {commanderQuery ? <input name="cq" type="hidden" value={commanderQuery} /> : null}
              <Button type="submit" variant="outline">
                Search
              </Button>
            </form>

            {searchResults.length > 0 ? (
              <div className="space-y-3">
                {searchResults.map((result) => (
                  <div key={result.id} className="rounded-2xl border border-border/70 bg-white p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium">{result.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {result.setName} · {result.setCode} #{result.collectorNumber}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {result.colors.length > 0 ? (
                            result.colors.map((color) => (
                              <Badge key={color} variant="outline">
                                {color}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="outline">Colorless</Badge>
                          )}
                          <Badge variant={result.available > 0 ? "success" : "warning"}>
                            {result.available}/{result.owned} available
                          </Badge>
                          {result.quantityInDeck > 0 ? <Badge variant="outline">{result.quantityInDeck} already in deck</Badge> : null}
                        </div>
                      </div>
                      {result.imageUrl ? (
                        <div className="relative h-24 w-16 overflow-hidden rounded-xl bg-slate-950/95">
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

        <Card>
          <CardHeader>
            <CardTitle>Deck editor</CardTitle>
            <CardDescription>Every entry can be moved, resized, or removed without leaving the page.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {detail.groupedEntries.map((group) =>
              group.entries.length > 0 ? (
                <div key={group.section} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{prettySection(group.section)}</h3>
                    <Badge variant="outline">
                      {group.entries.reduce((sum, entry) => sum + entry.quantity, 0)} cards
                    </Badge>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Card</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Available</TableHead>
                        <TableHead>Section</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.entries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{entry.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {entry.setCode} #{entry.collectorNumber}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <form action={setDeckEntryQuantityAction} className="flex items-center gap-2">
                              <input name="deckId" type="hidden" value={detail.deck.id} />
                              <input name="entryId" type="hidden" value={entry.id} />
                              <Input className="w-20" defaultValue={String(entry.quantity)} min="0" name="quantity" type="number" />
                              <Button size="sm" type="submit" variant="outline">
                                Set
                              </Button>
                            </form>
                          </TableCell>
                          <TableCell>{entry.available}</TableCell>
                          <TableCell>
                            <form action={updateDeckEntrySectionAction} className="flex items-center gap-2">
                              <input name="deckId" type="hidden" value={detail.deck.id} />
                              <input name="entryId" type="hidden" value={entry.id} />
                              <select
                                className="flex h-10 rounded-md border border-input bg-background/80 px-3 py-2 text-sm"
                                defaultValue={entry.section}
                                name="section"
                              >
                                {deckSections.map((section) => (
                                  <option key={section} value={section}>
                                    {prettySection(section)}
                                  </option>
                                ))}
                              </select>
                              <Button size="sm" type="submit" variant="outline">
                                Move
                              </Button>
                            </form>
                          </TableCell>
                          <TableCell>
                            <Badge variant={entry.shortfall > 0 ? "warning" : "success"}>
                              {entry.shortfall > 0 ? `${entry.shortfall} short` : "Covered"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <form action={removeDeckEntryAction}>
                              <input name="deckId" type="hidden" value={detail.deck.id} />
                              <input name="entryId" type="hidden" value={entry.id} />
                              <Button size="sm" type="submit" variant="ghost">
                                Remove
                              </Button>
                            </form>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : null
            )}

            {detail.entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">This deck has no entries yet. Use cached search to add cards.</p>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
