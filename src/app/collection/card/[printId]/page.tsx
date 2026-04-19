import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { addPrintToDeckAction, adjustCollectionBucketQuantityAction, cacheAndReassignCollectionPrintAction, deleteCollectionPrintAction, navigatePrintReassignSearchAction, reassignCollectionPrintAction, refreshPrintPricesAction, removePrintFromDeckAction, updateCollectionBucketAction } from "@/app/collection/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { RefreshPricesButton } from "@/components/ui/refresh-prices-button";
import { Input } from "@/components/ui/input";
import { ManaCost } from "@/components/ui/mana-cost";
import { collectionConditions, collectionFinishes, getCachedPrintingsByOracle, getCollectionPrintDetail } from "@/lib/collection/service";
import { deckSections, getDeckSummaries } from "@/lib/decks/service";
import { searchCardPrints } from "@/lib/scryfall/client";

export default async function CollectionPrintPage({
  params,
  searchParams
}: {
  params: { printId: string };
  searchParams?: { updated?: string; error?: string; added?: string; removed?: string; pricesRefreshed?: string; reassigned?: string; pq?: string };
}) {
  const [detail, decks] = await Promise.all([
    getCollectionPrintDetail(params.printId),
    getDeckSummaries()
  ]);

  if (!detail) {
    notFound();
  }

  const reassignQuery = searchParams?.pq?.trim() ?? "";
  const [cachedSameOracle, livePrintSearch] = await Promise.all([
    getCachedPrintingsByOracle(detail.print.oracleId, params.printId),
    reassignQuery ? searchCardPrints(`!"${reassignQuery}"`) : Promise.resolve({ results: [] as import("@/lib/scryfall/client").ScryfallSearchResult[], error: undefined })
  ]);

  return (
    <div className="space-y-6">
      {searchParams?.updated === "1" ? (
        <Card className="border-emerald-500/30 bg-emerald-500/10">
          <CardContent className="p-4 text-sm text-emerald-700 dark:text-emerald-400">Collection bucket updated.</CardContent>
        </Card>
      ) : null}

      {searchParams?.added === "1" ? (
        <Card className="border-emerald-500/30 bg-emerald-500/10">
          <CardContent className="p-4 text-sm text-emerald-700 dark:text-emerald-400">Card added to deck.</CardContent>
        </Card>
      ) : null}

      {searchParams?.removed === "1" ? (
        <Card className="border-emerald-500/30 bg-emerald-500/10">
          <CardContent className="p-4 text-sm text-emerald-700 dark:text-emerald-400">Card removed from deck.</CardContent>
        </Card>
      ) : null}

      {searchParams?.pricesRefreshed === "1" ? (
        <Card className="border-emerald-500/30 bg-emerald-500/10">
          <CardContent className="p-4 text-sm text-emerald-700 dark:text-emerald-400">Prices refreshed.</CardContent>
        </Card>
      ) : null}

      {searchParams?.reassigned === "1" ? (
        <Card className="border-emerald-500/30 bg-emerald-500/10">
          <CardContent className="p-4 text-sm text-emerald-700 dark:text-emerald-400">Printing updated. All collection items have been reassigned to this print.</CardContent>
        </Card>
      ) : null}

      {searchParams?.error ? (
        <Card className="border-amber-500/30 bg-amber-500/10">
          <CardContent className="p-4 text-sm text-amber-700 dark:text-amber-400">{decodeURIComponent(searchParams.error)}</CardContent>
        </Card>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {detail.print.imageUrl ? (
              <div className="relative aspect-[5/7] w-full bg-slate-950/95">
                <Image alt={detail.print.name} className="object-contain" fill sizes="(min-width: 1280px) 360px, (min-width: 1024px) 320px, 100vw" src={detail.print.imageUrl} />
              </div>
            ) : (
              <div className="flex aspect-[5/7] items-center justify-center bg-slate-950 px-6 text-center text-sm text-slate-300">
                Card image unavailable for this print.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <section className="flex flex-col gap-3">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Print detail</p>
            <h2 className="font-display text-4xl">{detail.print.name}</h2>
            <p className="text-sm text-muted-foreground">
              {detail.print.setName} · {detail.print.setCode} #{detail.print.collectorNumber}
            </p>
            <p className="max-w-3xl text-sm leading-7 text-muted-foreground">{detail.print.oracleText}</p>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">
            <Card>
              <CardHeader>
                <CardTitle>Print overview</CardTitle>
                <CardDescription>Exact-print metadata and totals across all owned buckets for this printing.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-950 p-4 text-slate-50">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Type line</p>
                  <p className="mt-3 text-lg font-semibold">{detail.print.typeLine ?? "Unknown type"}</p>
                </div>
                <div className="rounded-2xl bg-card p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Mana cost</p>
                  <div className="mt-3">
                    {detail.print.manaCost ? (
                      <ManaCost cost={detail.print.manaCost} size={22} />
                    ) : (
                      <span className="text-xl font-semibold text-muted-foreground">None</span>
                    )}
                  </div>
                </div>
                <div className="rounded-2xl bg-card p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Owned buckets</p>
                  <p className="mt-3 text-2xl font-semibold">{detail.summary.bucketCount}</p>
                </div>
                <div className="rounded-2xl bg-card p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Total copies</p>
                  <p className="mt-3 text-2xl font-semibold">
                    {detail.summary.totalCopies} total · {detail.summary.availableCopies} free
                  </p>
                </div>
                <div className="rounded-2xl bg-card p-4 sm:col-span-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Est. market value</p>
                      <p className="mt-3 text-2xl font-semibold tabular-nums">
                        {detail.summary.totalValue != null
                          ? `$${detail.summary.totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : "—"}
                      </p>
                      {detail.print.priceUsd != null ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          ${detail.print.priceUsd.toFixed(2)} nonfoil
                          {detail.print.priceUsdFoil != null ? ` · $${detail.print.priceUsdFoil.toFixed(2)} foil` : ""}
                        </p>
                      ) : null}
                    </div>
                    <form action={refreshPrintPricesAction} className="shrink-0">
                      <input name="printId" type="hidden" value={detail.print.printId} />
                      <RefreshPricesButton size="sm" variant="outline">
                        Refresh price
                      </RefreshPricesButton>
                    </form>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Deck usage</CardTitle>
                <CardDescription>Every tracked deck entry that references this exact print.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {detail.usedInDecks.length > 0 ? (
                  detail.usedInDecks.map((deck) => (
                    <div key={deck.entryId} className="rounded-2xl border border-border/70 bg-card p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <Link className="font-medium text-primary hover:underline" href={`/decks/${deck.deckId}`}>
                            {deck.deckName}
                          </Link>
                          <p className="text-sm text-muted-foreground">{deck.section}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{deck.quantity}×</Badge>
                          {deck.status === "covered" ? (
                            <Badge className="border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" variant="outline">covered</Badge>
                          ) : deck.status === "in-use" ? (
                            <Badge className="border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-400" variant="outline">in use elsewhere</Badge>
                          ) : deck.status === "short" ? (
                            <Badge className="border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-400" variant="outline">
                              {deck.shortfall > 1 ? `${deck.shortfall} short` : "short"}
                            </Badge>
                          ) : deck.status === "want-more" ? (
                            <Badge className="border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-400" variant="outline">
                              {deck.shortfall > 1 ? `${deck.shortfall} short` : "short"}
                            </Badge>
                          ) : deck.status === "unallocated" ? (
                            <Badge variant="outline" className="text-muted-foreground">not claimed</Badge>
                          ) : null}
                          <form action={removePrintFromDeckAction}>
                            <input name="printId" type="hidden" value={detail.print.printId} />
                            <input name="deckId" type="hidden" value={deck.deckId} />
                            <input name="entryId" type="hidden" value={deck.entryId} />
                            <button
                              className="text-xs text-muted-foreground hover:text-rose-500 transition-colors"
                              type="submit"
                            >
                              Remove
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">This print is not used in any tracked deck yet.</p>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      </section>

      {detail.otherPrintings.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Other printings in your collection</CardTitle>
            <CardDescription>Other versions of {detail.print.name} you own.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {detail.otherPrintings.map((p) => (
                <Link
                  key={p.printId}
                  href={`/collection/card/${p.printId}`}
                  className="flex items-center gap-3 rounded-xl border border-border/70 bg-card px-3 py-2 hover:bg-muted transition-colors"
                >
                  {p.imageSmall ? (
                    <div className="relative h-10 w-7 shrink-0 overflow-hidden rounded bg-muted">
                      <Image alt={`${p.setCode} #${p.collectorNumber}`} className="object-cover object-top" fill sizes="28px" src={p.imageSmall} />
                    </div>
                  ) : null}
                  <div>
                    <p className="text-sm font-medium">{p.setCode} #{p.collectorNumber}</p>
                    <p className="text-xs text-muted-foreground">{p.setName} · {p.totalQuantity}×</p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card id="change-printing">
        <CardHeader>
          <CardTitle>Change printing</CardTitle>
          <CardDescription>
            Reassign all collection items for this print to a different version of {detail.print.name}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {cachedSameOracle.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Cached printings</p>
              <div className="flex flex-wrap gap-3">
                {cachedSameOracle.map((p) => (
                  <form key={p.printId} action={reassignCollectionPrintAction}>
                    <input name="currentPrintId" type="hidden" value={detail.print.printId} />
                    <input name="newPrintId" type="hidden" value={p.printId} />
                    <button
                      className="flex items-center gap-3 rounded-xl border border-border/70 bg-card px-3 py-2 hover:bg-muted transition-colors text-left"
                      type="submit"
                    >
                      {p.imageSmall ? (
                        <div className="relative h-10 w-7 shrink-0 overflow-hidden rounded bg-muted">
                          <Image alt={`${p.setCode} #${p.collectorNumber}`} className="object-cover object-top" fill sizes="28px" src={p.imageSmall} />
                        </div>
                      ) : null}
                      <div>
                        <p className="text-sm font-medium">{p.setCode} #{p.collectorNumber}</p>
                        <p className="text-xs text-muted-foreground">{p.setName}</p>
                      </div>
                    </button>
                  </form>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Search Scryfall</p>
            <form action={navigatePrintReassignSearchAction} className="flex flex-col gap-3 sm:flex-row">
              <input name="currentPrintId" type="hidden" value={detail.print.printId} />
              <Input defaultValue={reassignQuery} name="pq" placeholder={`Search for ${detail.print.name} printings`} />
              <Button type="submit" variant="outline">Search</Button>
            </form>

            {livePrintSearch.results.length > 0 ? (
              <div className="space-y-3 pt-1">
                {livePrintSearch.results.map((result) => (
                  <div key={result.id} className="rounded-2xl border border-border/70 bg-card p-4">
                    <p className="font-medium">{result.name}</p>
                    <p className="text-sm text-muted-foreground">{result.setName} · {result.set} #{result.collectorNumber}</p>
                    <form action={cacheAndReassignCollectionPrintAction} className="mt-3">
                      <input name="currentPrintId" type="hidden" value={detail.print.printId} />
                      <input name="query" type="hidden" value={reassignQuery} />
                      <input name="result" type="hidden" value={JSON.stringify(result)} />
                      <Button size="sm" type="submit" variant="outline">Use this printing</Button>
                    </form>
                  </div>
                ))}
              </div>
            ) : reassignQuery ? (
              <p className="text-sm text-muted-foreground">No results found.</p>
            ) : (
              <p className="text-sm text-muted-foreground">Results will appear here.</p>
            )}

            {livePrintSearch.error ? (
              <p className="text-sm text-muted-foreground">{livePrintSearch.error}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add to deck</CardTitle>
          <CardDescription>Add this print directly to a deck in your collection.</CardDescription>
        </CardHeader>
        <CardContent>
          {decks.length > 0 ? (
            <div className="space-y-3">
              <form action={addPrintToDeckAction} className="grid gap-4 sm:grid-cols-[1fr_160px_100px_auto] sm:items-end">
                <input name="printId" type="hidden" value={detail.print.printId} />
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Deck</span>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background/80 px-3 py-2 text-sm"
                    name="deckId"
                  >
                    {decks.map((deck) => (
                      <option key={deck.id} value={deck.id}>
                        {deck.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Section</span>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background/80 px-3 py-2 text-sm"
                    defaultValue="mainboard"
                    name="section"
                  >
                    {deckSections.map((section) => (
                      <option key={section} value={section}>
                        {section.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Qty</span>
                  <Input
                    defaultValue="1"
                    min="1"
                    max={String(detail.summary.availableCopies)}
                    name="quantity"
                    type="number"
                    disabled={detail.summary.availableCopies === 0}
                  />
                </label>
                <Button type="submit" disabled={detail.summary.availableCopies === 0}>
                  Add to deck
                </Button>
              </form>
              {detail.summary.availableCopies === 0 ? (
                <p className="text-sm text-muted-foreground">
                  All {detail.summary.totalCopies} {detail.summary.totalCopies === 1 ? "copy" : "copies"} of this print are already assigned to decks.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {detail.summary.availableCopies} of {detail.summary.totalCopies} {detail.summary.totalCopies === 1 ? "copy" : "copies"} available to assign.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No decks yet.{" "}
              <Link className="text-primary hover:underline" href="/decks/new">
                Create one
              </Link>{" "}
              to get started.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>Owned buckets</CardTitle>
              <CardDescription>Adjust quantities and manage each owned bucket of this print.</CardDescription>
            </div>
            <form action={deleteCollectionPrintAction}>
              <input name="printId" type="hidden" value={detail.print.printId} />
              <ConfirmSubmitButton
                className="border-rose-300 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                confirmMessage={`Delete ${detail.print.name} from the collection? This will remove all owned buckets for this exact print.`}
                variant="outline"
              >
                Delete print
              </ConfirmSubmitButton>
            </form>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {detail.ownedBuckets.map((bucket) => (
            <div key={bucket.id} className="rounded-2xl border border-border/70 bg-card p-4 space-y-4">
              {/* Quantity stepper */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium capitalize">{bucket.finish} · {bucket.condition.replaceAll("_", " ")}</p>
                  {bucket.location ? <p className="text-xs text-muted-foreground">{bucket.location}</p> : null}
                </div>
                <div className="flex items-center gap-3">
                  <form action={adjustCollectionBucketQuantityAction}>
                    <input name="bucketId" type="hidden" value={bucket.id} />
                    <input name="printId" type="hidden" value={detail.print.printId} />
                    <input name="delta" type="hidden" value="-1" />
                    <button
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 text-muted-foreground hover:border-border hover:text-foreground transition-colors text-base font-medium"
                      type="submit"
                    >
                      −
                    </button>
                  </form>
                  <div className="text-center min-w-[80px]">
                    <p className="text-lg font-semibold tabular-nums">{bucket.quantityTotal}</p>
                    <p className="text-xs text-muted-foreground">{bucket.quantityAvailable} free</p>
                  </div>
                  <form action={adjustCollectionBucketQuantityAction}>
                    <input name="bucketId" type="hidden" value={bucket.id} />
                    <input name="printId" type="hidden" value={detail.print.printId} />
                    <input name="delta" type="hidden" value="1" />
                    <button
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 text-muted-foreground hover:border-border hover:text-foreground transition-colors text-base font-medium"
                      type="submit"
                    >
                      +
                    </button>
                  </form>
                </div>
              </div>

              {/* Edit details toggle */}
              <details className="group">
                <summary className="cursor-pointer list-none text-xs text-muted-foreground hover:text-foreground transition-colors [&::-webkit-details-marker]:hidden">
                  Edit details ▾
                </summary>
                <form action={updateCollectionBucketAction} className="mt-3 space-y-3">
                  <input name="bucketId" type="hidden" value={bucket.id} />
                  <input name="redirectTo" type="hidden" value="detail" />
                  <input name="redirectPrintId" type="hidden" value={detail.print.printId} />
                  <div className="grid gap-3 md:grid-cols-[110px_110px_150px_180px]">
                    <label className="space-y-1 text-xs">
                      <span className="font-medium uppercase tracking-[0.18em] text-muted-foreground">Total</span>
                      <Input defaultValue={String(bucket.quantityTotal)} min="0" name="quantityTotal" type="number" />
                    </label>
                    <label className="space-y-1 text-xs">
                      <span className="font-medium uppercase tracking-[0.18em] text-muted-foreground">Available</span>
                      <Input defaultValue={String(bucket.quantityAvailable)} min="0" name="quantityAvailable" type="number" />
                    </label>
                    <label className="space-y-1 text-xs">
                      <span className="font-medium uppercase tracking-[0.18em] text-muted-foreground">Finish</span>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background/80 px-3 py-2 text-sm"
                        defaultValue={bucket.finish}
                        name="finish"
                      >
                        {collectionFinishes.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1 text-xs">
                      <span className="font-medium uppercase tracking-[0.18em] text-muted-foreground">Condition</span>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background/80 px-3 py-2 text-sm"
                        defaultValue={bucket.condition}
                        name="condition"
                      >
                        {collectionConditions.map((c) => (
                          <option key={c} value={c}>{c.replaceAll("_", " ")}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                    <label className="space-y-1 text-xs">
                      <span className="font-medium uppercase tracking-[0.18em] text-muted-foreground">Location</span>
                      <Input defaultValue={bucket.location ?? ""} name="location" placeholder="Binder, staples box, deckbox drawer..." />
                    </label>
                    <Button type="submit" variant="outline">Save</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Set total to 0 to delete this bucket.</p>
                </form>
              </details>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
